// Configuration
const API_URL = window.location.origin;

// DOM Elements
let sidebar, toggleBtn, loader, message, debugInfo;
let showAllBinsBtn, showHeatmapBtn, showRouteBtn;
let autoRefreshBtn, manualRefreshBtn;
let totalBinsEl, criticalBinsEl, warningBinsEl, goodBinsEl, avgFillEl;
let addBinForm, cityInput, latInput, lonInput, fillLevelInput;
let filterChips;

// Map variables
let map = null;
let mapLayers = null;
let currentBins = [];
let activeFilter = 'all';
let autoRefreshInterval = null;

// Debug mode - set to false for production
const DEBUG_MODE = false;

// Initialize DOM elements
function initializeDOMElements() {
    sidebar = document.getElementById('sidebar');
    toggleBtn = document.getElementById('toggleBtn');
    loader = document.getElementById('loader');
    message = document.getElementById('message');
    debugInfo = document.getElementById('debugInfo');
    
    showAllBinsBtn = document.getElementById('showAllBinsBtn');
    showHeatmapBtn = document.getElementById('showHeatmapBtn');
    showRouteBtn = document.getElementById('showRouteBtn');
    
    autoRefreshBtn = document.getElementById('autoRefreshBtn');
    manualRefreshBtn = document.getElementById('manualRefreshBtn');
    
    totalBinsEl = document.getElementById('total-bins');
    criticalBinsEl = document.getElementById('critical-bins');
    warningBinsEl = document.getElementById('warning-bins');
    goodBinsEl = document.getElementById('good-bins');
    avgFillEl = document.getElementById('avg-fill');
    
    addBinForm = document.getElementById('addBinForm');
    cityInput = document.getElementById('cityInput');
    latInput = document.getElementById('latInput');
    lonInput = document.getElementById('lonInput');
    fillLevelInput = document.getElementById('fillLevelInput');
    
    filterChips = document.querySelectorAll('.filter-chip');
}

// Utility Functions
function showLoader(show = true) {
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showMessage(text, type = 'error') {
    if (!message) return;
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';
    
    setTimeout(() => {
        message.style.display = 'none';
    }, 5000);
}

function updateDebugInfo(text) {
    if (DEBUG_MODE && debugInfo) {
        debugInfo.textContent = text;
        debugInfo.style.display = 'block';
        console.log('DEBUG:', text);
    }
}

function updateActiveButton(activeBtn) {
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
}

function updateActiveFilter(activeFilterValue) {
    activeFilter = activeFilterValue;
    filterChips.forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.filter === activeFilter) {
            chip.classList.add('active');
        }
    });
}

function updateDashboardStats(bins) {
    if (!bins || !Array.isArray(bins)) return;
    
    const totalBins = bins.length;
    const criticalBins = bins.filter(b => b.status === 'critical' || b.fill_level > 90).length;
    const warningBins = bins.filter(b => b.status === 'warning' || (b.fill_level > 70 && b.fill_level <= 90)).length;
    const goodBins = bins.filter(b => b.status === 'good' || b.fill_level <= 70).length;
    
    const totalFill = bins.reduce((sum, b) => sum + (b.fill_level || 0), 0);
    const avgFill = totalBins > 0 ? (totalFill / totalBins).toFixed(1) : 0;

    if (totalBinsEl) totalBinsEl.textContent = totalBins;
    if (criticalBinsEl) criticalBinsEl.textContent = criticalBins;
    if (warningBinsEl) warningBinsEl.textContent = warningBins;
    if (goodBinsEl) goodBinsEl.textContent = goodBins;
    if (avgFillEl) avgFillEl.textContent = `${avgFill}%`;
    
    // Update stat card styles based on status
    updateStatCardStyles(criticalBins, warningBins, goodBins);
    
    updateDebugInfo(`Stats updated: ${totalBins} bins, ${criticalBins} critical, ${warningBins} warning, ${goodBins} good`);
}

function updateStatCardStyles(critical, warning, good) {
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 3) {
        // Remove existing status classes
        statCards[1].classList.remove('critical', 'warning', 'good');
        statCards[2].classList.remove('critical', 'warning', 'good'); 
        statCards[3].classList.remove('critical', 'warning', 'good');
        
        // Add appropriate classes
        if (critical > 0) statCards[1].classList.add('critical');
        if (warning > 0) statCards[2].classList.add('warning');
        if (good > 0) statCards[3].classList.add('good');
    }
}

function filterBins(bins, filter) {
    if (filter === 'all') return bins;
    
    return bins.filter(bin => {
        switch (filter) {
            case 'critical':
                return bin.status === 'critical' || bin.fill_level > 90;
            case 'warning':
                return bin.status === 'warning' || (bin.fill_level > 70 && bin.fill_level <= 90);
            case 'good':
                return bin.status === 'good' || bin.fill_level <= 70;
            default:
                return true;
        }
    });
}

function getBinColor(bin) {
    if (bin.status === 'critical' || bin.fill_level > 90) return '#e53e3e';
    if (bin.status === 'warning' || bin.fill_level > 70) return '#dd6b20';
    return '#38a169';
}

function createBinPopupContent(bin) {
    const status = bin.status || (bin.fill_level > 90 ? 'critical' : bin.fill_level > 70 ? 'warning' : 'good');
    const statusColor = getBinColor(bin);
    
    return `
        <div class="popup-content">
            <div class="popup-header">Bin #${bin.id} (${bin.city})</div>
            <div class="popup-details">
                <div style="color: ${statusColor}; font-weight: 600;">Status: ${status.toUpperCase()}</div>
                <div>Fill Level: <strong>${bin.fill_level}%</strong></div>
                <div>Location: ${bin.lat.toFixed(4)}, ${bin.lon.toFixed(4)}</div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn maintenance" onclick="scheduleMaintenance(${bin.id})">
                    <i class="fa-solid fa-wrench"></i> Maintenance
                </button>
                <button class="popup-btn delete" onclick="deleteBin(${bin.id})">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// Initialize Map
function initializeMap() {
    try {
        console.log('Initializing map...');
        updateDebugInfo('Initializing map...');
        
        map = L.map('map', {
            center: [24.0, 88.0],
            zoom: 7,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        mapLayers = L.layerGroup().addTo(map);

        console.log('Map initialized successfully');
        updateDebugInfo('Map initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing map:', error);
        updateDebugInfo(`Map init error: ${error.message}`);
        showMessage('Failed to initialize map. Please refresh the page.');
        return false;
    }
}

// API Functions
async function fetchStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return null;
    }
}

async function showAllBins() {
    if (!map) {
        showMessage('Map not initialized');
        return;
    }

    showLoader(true);
    updateDebugInfo('Fetching bins data...');
    
    try {
        console.log('Fetching bins...');
        mapLayers.clearLayers();
        
        const response = await fetch(`${API_URL}/api/bins`);
        console.log('Response status:', response.status);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const bins = await response.json();
        console.log('Bins received:', bins.length, bins);
        updateDebugInfo(`Received ${bins.length} bins`);
        
        if (!Array.isArray(bins) || bins.length === 0) {
            throw new Error('No valid bins data received');
        }

        currentBins = bins;
        updateDashboardStats(bins);

        // Apply current filter
        const filteredBins = filterBins(bins, activeFilter);
        
        // Add bins to map
        let binsAdded = 0;
        filteredBins.forEach((bin, index) => {
            if (!bin.lat || !bin.lon || isNaN(bin.lat) || isNaN(bin.lon)) {
                console.warn('Invalid bin data:', bin);
                return;
            }

            const color = getBinColor(bin);
            
            try {
                const circle = L.circle([parseFloat(bin.lat), parseFloat(bin.lon)], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.7,
                    radius: 1000,
                    weight: 3
                }).addTo(mapLayers);
                
                circle.bindPopup(createBinPopupContent(bin));
                binsAdded++;
            } catch (e) {
                console.error('Error adding bin to map:', e, bin);
            }
        });

        console.log(`Added ${binsAdded} bins to map`);
        updateDebugInfo(`Added ${binsAdded}/${filteredBins.length} bins to map`);

        if (binsAdded > 0) {
            const group = new L.featureGroup(mapLayers.getLayers());
            map.fitBounds(group.getBounds().pad(0.1));
            showMessage(`Successfully loaded ${binsAdded} waste bins${activeFilter !== 'all' ? ` (${activeFilter} filter)` : ''}`, 'success');
        } else {
            showMessage('No bins match the current filter', 'info');
        }

    } catch (error) {
        console.error('Failed to fetch bins:', error);
        updateDebugInfo(`Error: ${error.message}`);
        showMessage(`Failed to load bins: ${error.message}`);
    } finally {
        showLoader(false);
    }
}

async function showWasteHeatmap() {
    if (!map) {
        showMessage('Map not initialized');
        return;
    }

    showLoader(true);
    updateDebugInfo('Fetching heatmap data...');
    
    try {
        console.log('Fetching heatmap data...');
        mapLayers.clearLayers();
        
        const response = await fetch(`${API_URL}/api/heatmap`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const heatmapData = await response.json();
        console.log('Heatmap data received:', heatmapData.length, heatmapData);
        updateDebugInfo(`Received ${heatmapData.length} heatmap points`);

        if (heatmapData && heatmapData.length > 0) {
            const validData = heatmapData.filter(point => 
                Array.isArray(point) && 
                point.length >= 3 && 
                !isNaN(point[0]) && 
                !isNaN(point[1]) && 
                !isNaN(point[2])
            );

            if (validData.length === 0) {
                throw new Error('No valid heatmap data points');
            }

            console.log('Valid heatmap points:', validData.length);
            updateDebugInfo(`Using ${validData.length} valid heatmap points`);

            L.heatLayer(validData, {
                radius: 25,
                blur: 35,
                maxZoom: 12,
                gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
            }).addTo(mapLayers);

            showMessage(`Heatmap loaded with ${validData.length} data points`, 'success');
        } else {
            throw new Error('No heatmap data available');
        }

    } catch (error) {
        console.error('Failed to fetch heatmap:', error);
        updateDebugInfo(`Heatmap error: ${error.message}`);
        showMessage(`Failed to load heatmap: ${error.message}`);
    } finally {
        showLoader(false);
    }
}

async function showOptimizedRoute() {
    if (!map) {
        showMessage('Map not initialized');
        return;
    }

    showLoader(true);
    updateDebugInfo('Fetching route data...');
    
    try {
        console.log('Fetching route data...');
        mapLayers.clearLayers();
        
        const response = await fetch(`${API_URL}/api/route`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log('Route data received:', data);
        updateDebugInfo(`Route: ${data.bins.length} bins to collect`);

        if (data.bins.length === 0) {
            showMessage("No bins require collection at this time.", 'success');
            setTimeout(() => showAllBins(), 2000);
            return;
        }

        let markersAdded = 0;
        data.bins.forEach((bin, index) => {
            if (!bin.lat || !bin.lon || isNaN(bin.lat) || isNaN(bin.lon)) {
                console.warn('Invalid route bin data:', bin);
                return;
            }

            try {
                const marker = L.marker([parseFloat(bin.lat), parseFloat(bin.lon)]).addTo(mapLayers);
                marker.bindPopup(`<b>Stop ${index + 1}: Bin #${bin.id}</b><br>${bin.city}<br>Fill Level: <b>${bin.fill_level}%</b>`);
                markersAdded++;
            } catch (e) {
                console.error('Error adding route marker:', e, bin);
            }
        });

        if (data.route_geometry && data.route_geometry.length > 0) {
            try {
                const polyline = L.polyline(data.route_geometry, {
                    color: '#2c5282',
                    weight: 6,
                    opacity: 0.9
                }).addTo(mapLayers);
                map.fitBounds(polyline.getBounds().pad(0.1));
            } catch (e) {
                console.error('Error adding route line:', e);
            }
        }

        showMessage(`Route generated with ${markersAdded} collection points`, 'success');
        updateDebugInfo(`Route displayed: ${markersAdded} markers`);

    } catch (error) {
        console.error('Failed to fetch route:', error);
        updateDebugInfo(`Route error: ${error.message}`);
        showMessage(`Failed to generate route: ${error.message}`);
    } finally {
        showLoader(false);
    }
}

async function addBin(binData) {
    try {
        const response = await fetch(`${API_URL}/api/bins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(binData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add bin');
        }

        const newBin = await response.json();
        showMessage(`Bin #${newBin.id} added successfully!`, 'success');
        
        // Refresh the view
        setTimeout(() => showAllBins(), 1000);
        
        return newBin;
    } catch (error) {
        console.error('Failed to add bin:', error);
        showMessage(`Failed to add bin: ${error.message}`);
        throw error;
    }
}

async function deleteBin(binId) {
    if (!confirm('Are you sure you want to delete this bin?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/bins/${binId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete bin');
        }

        showMessage(`Bin #${binId} deleted successfully!`, 'success');
        
        // Refresh the view
        setTimeout(() => showAllBins(), 1000);
        
    } catch (error) {
        console.error('Failed to delete bin:', error);
        showMessage(`Failed to delete bin: ${error.message}`);
    }
}

async function scheduleMaintenance(binId) {
    const maintenanceType = prompt('Enter maintenance type (collection, repair, cleaning):', 'collection');
    if (!maintenanceType) return;
    
    try {
        const response = await fetch(`${API_URL}/api/bins/${binId}/maintenance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: maintenanceType,
                scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to schedule maintenance');
        }

        showMessage(`Maintenance scheduled for bin #${binId}!`, 'success');
        
    } catch (error) {
        console.error('Failed to schedule maintenance:', error);
        showMessage(`Failed to schedule maintenance: ${error.message}`);
    }
}

function toggleAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        if (autoRefreshBtn) {
            autoRefreshBtn.classList.remove('active');
            autoRefreshBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
        showMessage('Auto-refresh disabled', 'info');
    } else {
        autoRefreshInterval = setInterval(() => {
            if (showAllBinsBtn && showAllBinsBtn.classList.contains('active')) {
                showAllBins();
            }
        }, 30000); // Refresh every 30 seconds
        
        if (autoRefreshBtn) {
            autoRefreshBtn.classList.add('active');
            autoRefreshBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
        showMessage('Auto-refresh enabled (30s interval)', 'success');
    }
}

// Event Listeners
function setupEventListeners() {
    // Toggle button
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            console.log('Toggle button clicked');
            sidebar.classList.toggle('collapsed');
            toggleBtn.classList.toggle('rotated');
            
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 300);
        });
    }

    // Control buttons
    if (showAllBinsBtn) {
        showAllBinsBtn.addEventListener('click', () => {
            updateActiveButton(showAllBinsBtn);
            showAllBins();
        });
    }

    if (showHeatmapBtn) {
        showHeatmapBtn.addEventListener('click', () => {
            updateActiveButton(showHeatmapBtn);
            showWasteHeatmap();
        });
    }

    if (showRouteBtn) {
        showRouteBtn.addEventListener('click', () => {
            updateActiveButton(showRouteBtn);
            showOptimizedRoute();
        });
    }

    // Refresh controls
    if (autoRefreshBtn) {
        autoRefreshBtn.addEventListener('click', toggleAutoRefresh);
    }

    if (manualRefreshBtn) {
        manualRefreshBtn.addEventListener('click', () => {
            if (showAllBinsBtn && showAllBinsBtn.classList.contains('active')) {
                showAllBins();
            } else if (showHeatmapBtn && showHeatmapBtn.classList.contains('active')) {
                showWasteHeatmap();
            } else if (showRouteBtn && showRouteBtn.classList.contains('active')) {
                showOptimizedRoute();
            }
        });
    }

    // Filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.filter;
            updateActiveFilter(filter);
            if (currentBins.length > 0) {
                showAllBins(); // Refresh with new filter
            }
        });
    });

    // Add bin form
    if (addBinForm) {
        addBinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const binData = {
                city: cityInput.value.trim(),
                lat: parseFloat(latInput.value),
                lon: parseFloat(lonInput.value),
                fill_level: parseInt(fillLevelInput.value) || 0
            };

            if (!binData.city || isNaN(binData.lat) || isNaN(binData.lon)) {
                showMessage('Please fill in all required fields correctly');
                return;
            }

            try {
                await addBin(binData);
                addBinForm.reset();
            } catch (error) {
                // Error already handled in addBin function
            }
        });
    }

    // Window resize
    window.addEventListener('resize', () => {
        if (map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    updateDebugInfo('DOM loaded, starting initialization...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize map
    if (initializeMap()) {
        // Load initial data after a short delay
        setTimeout(() => {
            showAllBins();
        }, 1000);
    }
});

// Debug: Log any JavaScript errors
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
    updateDebugInfo(`JS Error: ${e.error.message}`);
});

// Make functions globally available for popup buttons
window.scheduleMaintenance = scheduleMaintenance;
window.deleteBin = deleteBin;