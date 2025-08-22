class SmartWasteManager {
    constructor() {
        this.map = null;
        this.mapLayers = null;
        this.bins = [];
        this.API_BASE_URL = window.location.origin + '/api';
        this.refreshInterval = null;
        this.currentFilter = 'all';

        // Force demo mode so you see ~60 bins regardless of backend data.
        // Set to false later if your API returns many bins.
        this.useDemoBins = true;

        // How many demo bins to generate across India
        this.demoBinsCount = 60;

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.initializeMap();
            await this.loadDashboardData();
            this.startAutoRefresh();
            this.showMessage('Smart Waste Management System loaded successfully!', 'success');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showMessage('Failed to initialize application. Please refresh the page.', 'error');
        }
    }

    setupEventListeners() {
        // Toggle sidebar
        const toggleBtn = document.getElementById('toggleBtn');
        const sidebar = document.querySelector('.dashboard-sidebar');

        toggleBtn?.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });

        // Control buttons
        document.getElementById('showAllBinsBtn')?.addEventListener('click', () => {
            this.showAllBins();
            this.setActiveButton('showAllBinsBtn');
        });

        document.getElementById('showCriticalBtn')?.addEventListener('click', () => {
            this.showCriticalBins();
            this.setActiveButton('showCriticalBtn');
        });

        document.getElementById('addBinBtn')?.addEventListener('click', () => {
            this.showAddBinModal();
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Modal events
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('addBinForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddBin();
        });

        // Cancel button in the add form
        document.getElementById('cancelAdd')?.addEventListener('click', () => {
            this.hideModal();
        });

        // Filter buttons
        document.getElementById('filterAll')?.addEventListener('click', () => {
            this.currentFilter = 'all';
            this.updateBinsList();
            this.setActiveFilter('filterAll');
        });

        document.getElementById('filterCritical')?.addEventListener('click', () => {
            this.currentFilter = 'critical';
            this.updateBinsList();
            this.setActiveFilter('filterCritical');
        });

        document.getElementById('filterWarning')?.addEventListener('click', () => {
            this.currentFilter = 'warning';
            this.updateBinsList();
            this.setActiveFilter('filterWarning');
        });

        document.getElementById('filterGood')?.addEventListener('click', () => {
            this.currentFilter = 'good';
            this.updateBinsList();
            this.setActiveFilter('filterGood');
        });

        // Close modal when clicking outside content
        document.getElementById('addBinModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'addBinModal') {
                this.hideModal();
            }
        });
    }

    // Center map over India and prepare layers
    async initializeMap() {
        try {
            // Check if Leaflet is available
            if (typeof L === 'undefined') {
                console.log('Leaflet not available, initializing demo mode');
                this.initializeDemoMap();
                return;
            }

            // Prefer Canvas for better performance with many markers
            this.map = L.map('map', { preferCanvas: true }).setView([22.9734, 78.6569], 5);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Create layer group for markers
            this.mapLayers = L.layerGroup().addTo(this.map);

            // Click-to-fill lat/lng when modal is open
            this.map.on('click', (e) => {
                const modal = document.getElementById('addBinModal');
                if (modal && modal.style.display === 'flex') {
                    document.getElementById('binLat').value = e.latlng.lat.toFixed(6);
                    document.getElementById('binLng').value = e.latlng.lng.toFixed(6);
                    this.showMessage('Location selected! Fill in the bin details.', 'success');
                }
            });

            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.initializeDemoMap();
        }
    }

    // Fallback demo view when Leaflet/tiles not available
    initializeDemoMap() {
        const mapElement = document.getElementById('map');
        mapElement.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                text-align: center;
                flex-direction: column;
                position: relative;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">🗺️</div>
                <div style="font-weight: 600;">Interactive Map - Demo Mode</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">
                    External map resources unavailable
                </div>
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px; max-width: 300px;">
                    <div style="margin-bottom: 10px;">📍 Smart Bins Status:</div>
                    <div style="display: flex; justify-content: space-between; gap: 10px;">
                        <span>🔴 Critical: <span id="demo-critical">0</span></span>
                        <span>🟡 Warning: <span id="demo-warning">0</span></span>
                        <span>🟢 Good: <span id="demo-good">0</span></span>
                    </div>
                </div>
                <div style="position: absolute; bottom: 20px; right: 20px; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; font-size: 12px;">
                    Click "Refresh Data" to load bin information
                </div>
            </div>
        `;

        // Mock map object
        this.map = {
            setView: () => this.map,
            on: () => this.map,
            fitBounds: () => this.map,
            invalidateSize: () => this.map
        };

        this.mapLayers = {
            addTo: () => this.mapLayers,
            clearLayers: () => this.mapLayers,
            getLayers: () => []
        };

        console.log('Demo map initialized');
    }

    async loadDashboardData() {
        this.showLoader(true);
        try {
            // Load bins and statistics
            await Promise.all([
                this.loadBins(),
                this.loadStatistics()
            ]);

            this.updateBinsList();
            this.showAllBins();

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showMessage('Failed to load dashboard data', 'error');
        } finally {
            this.showLoader(false);
        }
    }

    async loadBins() {
        // Force demo bins to guarantee 50–60 markers across India
        if (this.useDemoBins) {
            this.bins = this.generateDemoData();
            console.log(`Loaded ${this.bins.length} demo bins (forced)`);
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/bins`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.bins = await response.json();
            console.log(`Loaded ${this.bins.length} bins from API`);
        } catch (error) {
            console.error('Failed to load bins:', error);
            // Fallback to demo data with ~60 bins across India
            this.bins = this.generateDemoData();
            this.showMessage('Using demo data - API not available', 'warning');
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/statistics`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const stats = await response.json();
            this.updateStatistics(stats);
        } catch (error) {
            console.error('Failed to load statistics:', error);
            // Calculate from bins data
            this.updateStatistics(this.calculateStatsFromBins());
        }
    }

    // Larger, realistic demo set spread across Indian cities
    generateDemoData() {
        const cities = [
            { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
            { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
            { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
            { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
            { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
            { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
            { name: 'Pune', lat: 18.5204, lng: 73.8567 },
            { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
            { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
            { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
            { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
            { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
            { name: 'Indore', lat: 22.7196, lng: 75.8577 },
            { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
            { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
            { name: 'Patna', lat: 25.5941, lng: 85.1376 },
            { name: 'Vadodara', lat: 22.3072, lng: 73.1812 },
            { name: 'Ludhiana', lat: 30.9000, lng: 75.8573 },
            { name: 'Agra', lat: 27.1767, lng: 78.0081 },
            { name: 'Guwahati', lat: 26.1445, lng: 91.7362 },
            { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
            { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
            { name: 'Madurai', lat: 9.9252, lng: 78.1198 },
            { name: 'Raipur', lat: 21.2514, lng: 81.6296 },
            { name: 'Ranchi', lat: 23.3441, lng: 85.3096 }
        ];

        const totalBins = this.demoBinsCount || 60;
        const bins = [];
        let id = 1;

        // ~±0.09° jitter (~10km) around city centers to distribute bins
        const jitter = () => (Math.random() - 0.5) * 0.18;

        for (let i = 0; i < totalBins; i++) {
            const city = cities[i % cities.length];
            const capacity = 100;

            // Distribute fill levels to obtain varied statuses
            let currentLevel;
            if (i % 6 === 0) currentLevel = 85 + Math.round(Math.random() * 10);       // critical
            else if (i % 3 === 0) currentLevel = 55 + Math.round(Math.random() * 20);   // warning
            else currentLevel = Math.round(Math.random() * 45);                          // good

            const status = this.getStatusFromLevel(currentLevel);

            bins.push({
                id: id++,
                name: `${city.name} Bin ${Math.floor(i / cities.length) + 1}`,
                lat: +(city.lat + jitter()).toFixed(6),
                lng: +(city.lng + jitter()).toFixed(6),
                capacity,
                currentLevel,
                status
            });
        }

        return bins;
    }

    getStatusFromLevel(level) {
        if (level >= 80) return 'critical';
        if (level >= 50) return 'warning';
        return 'good';
    }

    calculateStatsFromBins() {
        const total = this.bins.length;
        const critical = this.bins.filter(bin => bin.status === 'critical').length;
        const warning = this.bins.filter(bin => bin.status === 'warning').length;
        const good = this.bins.filter(bin => bin.status === 'good').length;
        const averageLevel = total > 0 ?
            (this.bins.reduce((sum, bin) => sum + bin.currentLevel, 0) / total).toFixed(1) : 0;

        return { total, critical, warning, good, averageLevel };
    }

    updateStatistics(stats) {
        document.getElementById('totalBins').textContent = stats.total || 0;
        document.getElementById('criticalBins').textContent = stats.critical || 0;
        document.getElementById('warningBins').textContent = stats.warning || 0;
        document.getElementById('goodBins').textContent = stats.good || 0;
        document.getElementById('averageLevel').textContent = `${stats.averageLevel || 0}%`;
    }

    showAllBins() {
        this.clearMapLayers();

        if (!this.bins.length) {
            this.showMessage('No bins data available', 'warning');
            return;
        }

        // Update demo mode statistics if in demo mode
        if (typeof L === 'undefined' || !this.map.addLayer) {
            this.updateDemoStatistics();
        }

        let addedBins = 0;
        this.bins.forEach(bin => {
            if (this.isValidBin(bin)) {
                this.addBinToMap(bin);
                addedBins++;
            }
        });

        if (addedBins > 0) {
            this.fitMapToBins();
            this.showMessage(`Displaying ${addedBins} waste bins`, 'success');
        }
    }

    updateDemoStatistics() {
        const critical = this.bins.filter(bin => bin.status === 'critical').length;
        const warning = this.bins.filter(bin => bin.status === 'warning').length;
        const good = this.bins.filter(bin => bin.status === 'good').length;

        const demoCritical = document.getElementById('demo-critical');
        const demoWarning = document.getElementById('demo-warning');
        const demoGood = document.getElementById('demo-good');

        if (demoCritical) demoCritical.textContent = critical;
        if (demoWarning) demoWarning.textContent = warning;
        if (demoGood) demoGood.textContent = good;
    }

    showCriticalBins() {
        this.clearMapLayers();

        const criticalBins = this.bins.filter(bin => bin.status === 'critical');

        if (criticalBins.length === 0) {
            this.showMessage('No critical bins found', 'success');
            return;
        }

        criticalBins.forEach(bin => {
            if (this.isValidBin(bin)) {
                this.addBinToMap(bin);
            }
        });

        this.fitMapToBins();
        this.showMessage(`Displaying ${criticalBins.length} critical bins`, 'warning');
    }

    // Use precise, small pixel markers instead of large 200m circles
    addBinToMap(bin) {
        // Skip map operations in demo mode
        if (typeof L === 'undefined' || !this.map.addLayer) {
            console.log(`Demo mode: Would add bin ${bin.name} with status ${bin.status}`);
            return;
        }

        const color = this.getStatusColor(bin.status);

        const marker = L.circleMarker([bin.lat, bin.lng], {
            radius: 6,          // small, accurate
            color: color,
            fillColor: color,
            fillOpacity: 0.9,
            weight: 1,
            opacity: 0.9
        }).addTo(this.mapLayers);

        const popupContent = `
            <div class="bin-popup">
                <h4>${bin.name}</h4>
                <p><strong>Status:</strong> <span class="status-${bin.status}">${bin.status.toUpperCase()}</span></p>
                <p><strong>Fill Level:</strong> ${bin.currentLevel}%</p>
                <p><strong>Capacity:</strong> ${bin.capacity}L</p>
                <div class="popup-actions">
                    <button onclick="wasteManager.scheduleMaintenance(${bin.id})" class="btn btn-sm btn-primary">
                        Schedule Pickup
                    </button>
                    <button onclick="wasteManager.deleteBin(${bin.id})" class="btn btn-sm btn-secondary">
                        Remove Bin
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.bindTooltip(bin.name, { direction: 'top', offset: [0, -6] });
    }

    isValidBin(bin) {
        return bin &&
            typeof bin.lat === 'number' &&
            typeof bin.lng === 'number' &&
            !isNaN(bin.lat) &&
            !isNaN(bin.lng);
    }

    getStatusColor(status) {
        switch (status) {
            case 'critical': return '#e53e3e';
            case 'warning': return '#ed8936';
            case 'good': return '#38a169';
            default: return '#718096';
        }
    }

    clearMapLayers() {
        if (this.mapLayers && typeof this.mapLayers.clearLayers === 'function') {
            this.mapLayers.clearLayers();
        }
    }

    fitMapToBins() {
        if (!this.mapLayers || typeof L === 'undefined') return;
        const layers = this.mapLayers.getLayers ? this.mapLayers.getLayers() : [];
        if (layers.length > 0) {
            const group = new L.featureGroup(layers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    updateBinsList() {
        const binsList = document.getElementById('binsList');
        if (!binsList) return;

        let filteredBins = this.bins;
        if (this.currentFilter !== 'all') {
            filteredBins = this.bins.filter(bin => bin.status === this.currentFilter);
        }

        if (filteredBins.length === 0) {
            binsList.innerHTML = '<p class="no-bins">No bins found for the selected filter.</p>';
            return;
        }

        binsList.innerHTML = filteredBins.map(bin => `
            <div class="bin-card ${bin.status}">
                <h4>${bin.name}</h4>
                <div class="bin-info">Status: <span class="status-${bin.status}">${bin.status.toUpperCase()}</span></div>
                <div class="bin-info">Fill Level: ${bin.currentLevel}%</div>
                <div class="bin-info">Capacity: ${bin.capacity}L</div>
                <div class="bin-actions">
                    <button onclick="wasteManager.scheduleMaintenance(${bin.id})" class="btn btn-sm btn-primary">
                        Schedule Pickup
                    </button>
                    <button onclick="wasteManager.deleteBin(${bin.id})" class="btn btn-sm btn-secondary">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    async scheduleMaintenance(binId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/bins/${binId}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'pickup',
                    notes: 'Scheduled via dashboard'
                })
            });

            if (!response.ok) throw new Error('Failed to schedule maintenance');

            await response.json();
            this.showMessage('Maintenance scheduled successfully!', 'success');

        } catch (error) {
            console.error('Failed to schedule maintenance:', error);
            this.showMessage('Failed to schedule maintenance', 'error');
        }
    }

    async deleteBin(binId) {
        if (!confirm('Are you sure you want to delete this bin?')) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/bins/${binId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete bin');

            // Remove from local data
            this.bins = this.bins.filter(bin => bin.id !== binId);

            // Update UI
            this.loadDashboardData();
            this.showMessage('Bin deleted successfully!', 'success');

        } catch (error) {
            console.error('Failed to delete bin:', error);
            this.showMessage('Failed to delete bin', 'error');
        }
    }

    showAddBinModal() {
        const modal = document.getElementById('addBinModal');
        modal.style.display = 'flex';

        // Clear form
        document.getElementById('addBinForm').reset();

        this.showMessage('Click on the map to select a location for the new bin', 'success');
    }

    hideModal() {
        const modal = document.getElementById('addBinModal');
        modal.style.display = 'none';
    }

    async handleAddBin() {
        const formData = new FormData(document.getElementById('addBinForm'));

        const binData = {
            name: formData.get('name'),
            lat: parseFloat(formData.get('lat')),
            lng: parseFloat(formData.get('lng')),
            capacity: parseInt(formData.get('capacity')) || 100,
            currentLevel: parseInt(formData.get('currentLevel')) || 0
        };

        // Validate data
        if (!binData.name || isNaN(binData.lat) || isNaN(binData.lng)) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/bins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(binData)
            });

            if (!response.ok) throw new Error('Failed to add bin');

            await response.json();
            this.hideModal();
            this.loadDashboardData();
            this.showMessage('Bin added successfully!', 'success');

        } catch (error) {
            console.error('Failed to add bin:', error);
            this.showMessage('Failed to add bin', 'error');
        }
    }

    setActiveButton(buttonId) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(buttonId)?.classList.add('active');
    }

    setActiveFilter(buttonId) {
        document.querySelectorAll('[id^="filter"]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(buttonId)?.classList.add('active');
    }

    showLoader(show = true) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    showMessage(text, type = 'success') {
        const messageEl = document.getElementById('message');
        if (!messageEl) return;

        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';

        // Auto hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);

        console.log(`${type.toUpperCase()}: ${text}`);
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Expose instance globally for popup button handlers
window.addEventListener('DOMContentLoaded', () => {
    window.wasteManager = new SmartWasteManager();
});
