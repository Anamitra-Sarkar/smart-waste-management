/**
 * Smart Waste Management System - Frontend JavaScript
 * Complete client-side functionality for the waste management dashboard
 */

class SmartWasteManager {
    constructor() {
        this.map = null;
        this.mapLayers = null;
        this.bins = [];
        this.API_BASE_URL = window.location.origin + '/api';
        this.refreshInterval = null;
        this.currentFilter = 'all';
        
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
        
        // Close modal when clicking outside
        document.getElementById('addBinModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'addBinModal') {
                this.hideModal();
            }
        });
    }
    
    async initializeMap() {
        try {
            // Check if Leaflet is available
            if (typeof L === 'undefined') {
                console.log('Leaflet not available, initializing demo mode');
                this.initializeDemoMap();
                return;
            }
            
            // Initialize Leaflet map centered on Delhi, India
            this.map = L.map('map').setView([28.6139, 77.2090], 12);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);
            
            // Create layer group for markers
            this.mapLayers = L.layerGroup().addTo(this.map);
            
            // Add click event for adding bins
            this.map.on('click', (e) => {
                if (document.getElementById('addBinModal').style.display === 'flex') {
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
        
        // Create mock map object
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
        try {
            const response = await fetch(`${this.API_BASE_URL}/bins`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            this.bins = await response.json();
            console.log(`Loaded ${this.bins.length} bins`);
        } catch (error) {
            console.error('Failed to load bins:', error);
            // Fallback to demo data
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
    
    generateDemoData() {
        return [
            {
                id: 1,
                name: "Central Park Bin 1",
                lat: 28.6139,
                lng: 77.2090,
                capacity: 100,
                currentLevel: 85,
                status: "critical"
            },
            {
                id: 2,
                name: "Downtown Plaza Bin",
                lat: 28.6129,
                lng: 77.2100,
                capacity: 100,
                currentLevel: 65,
                status: "warning"
            },
            {
                id: 3,
                name: "Mall Complex Bin 3",
                lat: 28.6149,
                lng: 77.2080,
                capacity: 100,
                currentLevel: 35,
                status: "good"
            },
            {
                id: 4,
                name: "Residential Area Bin",
                lat: 28.6159,
                lng: 77.2070,
                capacity: 100,
                currentLevel: 20,
                status: "good"
            },
            {
                id: 5,
                name: "Office District Bin",
                lat: 28.6119,
                lng: 77.2110,
                capacity: 100,
                currentLevel: 75,
                status: "warning"
            }
        ];
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
    
    addBinToMap(bin) {
        // Skip map operations in demo mode
        if (typeof L === 'undefined' || !this.map.addLayer) {
            console.log(`Demo mode: Would add bin ${bin.name} with status ${bin.status}`);
            return;
        }
        
        const color = this.getStatusColor(bin.status);
        
        // Create circle marker
        const circle = L.circle([bin.lat, bin.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            radius: 200,
            weight: 3
        }).addTo(this.mapLayers);
        
        // Create popup content
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
        
        circle.bindPopup(popupContent);
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
        if (this.mapLayers) {
            this.mapLayers.clearLayers();
        }
    }
    
    fitMapToBins() {
        const layers = this.mapLayers.getLayers();
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
            
            const result = await response.json();
            this.showMessage('Maintenance scheduled successfully!', 'success');
            console.log('Maintenance scheduled:', result);
            
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
            
            const result = await response.json();
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

// Initialize the application when DOM is loaded
let wasteManager;

document.addEventListener('DOMContentLoaded', () => {
    wasteManager = new SmartWasteManager();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (wasteManager) {
        wasteManager.stopAutoRefresh();
    }
});