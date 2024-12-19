import * as DataManager from './data-manager.js';
import * as MapHandler from './map-handler.js';
import * as UIUtils from './ui-utils.js';

let autoRefreshInterval;

// Initialize admin panel
export async function initializeAdmin() {
    try {
        // Initialize map first
        MapHandler.initMap();
        console.log('Map initialized');
        
        // Load initial data
        await refreshData();
        console.log('Initial data loaded');
        
        // Load current theme
        const activeTheme = await DataManager.getCurrentTheme();
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = activeTheme;
        }
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Failed to initialize admin panel:', error);
        UIUtils.showError('Failed to initialize admin panel. Please refresh the page.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auto-refresh checkbox
    const autoRefreshCheckbox = document.getElementById('autoRefresh');
    if (autoRefreshCheckbox) {
        autoRefreshCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                autoRefreshInterval = setInterval(refreshData, 30000);
            } else {
                clearInterval(autoRefreshInterval);
            }
        });
    }

    // Theme select
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            updateTheme(e.target.value);
        });
    }
}

// Refresh data
export async function refreshData() {
    try {
        console.log('Refreshing data...');
        MapHandler.clearMarkers();
        const locations = await DataManager.fetchLocations();
        console.log('Fetched locations:', locations);
        
        const logsTable = document.getElementById('logsTable');
        if (!logsTable) {
            console.error('Logs table not found');
            return;
        }
        logsTable.innerHTML = '';
        
        let latestLocation = null;
        
        locations.forEach(data => {
            if (!latestLocation || new Date(data.timestamp) > new Date(latestLocation.timestamp)) {
                latestLocation = data;
            }
            
            // Add marker to map with full location data
            console.log('Adding marker:', data.latitude, data.longitude);
            const marker = MapHandler.addMarker(
                data.latitude, 
                data.longitude,
                data
            );
            
            // Create table row
            const row = UIUtils.createLocationRow(
                data,
                data.key,
                async (locationBtn) => {
                    await requestLocationUpdate(data.key, data, locationBtn, marker);
                },
                async () => {
                    if (confirm('Are you sure you want to delete this location record?')) {
                        try {
                            await DataManager.deleteLocation(data.key);
                            row.remove();
                            MapHandler.removeMarker(data.latitude, data.longitude);
                            UIUtils.showToast('Location deleted successfully', 'success');
                        } catch (error) {
                            UIUtils.showError('Error deleting record. Please try again.');
                        }
                    }
                }
            );
            
            // Add row click handler
            row.addEventListener('click', () => {
                document.querySelectorAll('.logs tr').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                MapHandler.focusLocation(data.latitude, data.longitude, true);
            });
            
            logsTable.appendChild(row);
        });
        
        // Focus on latest location
        if (latestLocation) {
            console.log('Focusing on latest location:', latestLocation.latitude, latestLocation.longitude);
            MapHandler.focusLocation(latestLocation.latitude, latestLocation.longitude);
        }
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        UIUtils.showError('Error fetching data. Please try again.');
    }
}

// Update theme
async function updateTheme(themeName) {
    if (confirm('Are you sure you want to change the active theme?')) {
        try {
            await DataManager.updateTheme(themeName);
            UIUtils.showToast('Theme updated successfully', 'success');
        } catch (error) {
            UIUtils.showToast('Error updating theme: ' + error.message, 'error');
        }
    }
}

// Request location update
async function requestLocationUpdate(locationKey, currentData, locationBtn, currentMarker) {
    locationBtn.disabled = true;
    locationBtn.textContent = 'Requesting...';

    try {
        const requestRef = await DataManager.requestLocationUpdate(locationKey);

        // Listen for updates to this request
        requestRef.on('value', async (snapshot) => {
            const request = snapshot.val();
            if (!request) return;

            if (request.status === 'completed' && request.newLocation) {
                // Update the marker on the map
                MapHandler.removeMarker(currentData.latitude, currentData.longitude);
                
                const newMarker = MapHandler.addMarker(
                    request.newLocation.latitude,
                    request.newLocation.longitude,
                    {
                        ...currentData,
                        ...request.newLocation,
                        timestamp: new Date().toISOString()
                    }
                );
                
                MapHandler.focusLocation(request.newLocation.latitude, request.newLocation.longitude);
                
                UIUtils.showToast('Location updated successfully', 'success');
                requestRef.off('value');
                refreshData(); // Refresh the table
            } else if (request.status === 'failed') {
                // Show specific error message from location tracker
                UIUtils.showToast(request.error || 'Failed to update location', 'error');
                requestRef.off('value');
            }

            locationBtn.disabled = false;
            locationBtn.textContent = 'Request Location';
        });

        // Set a timeout to stop listening after 30 seconds
        setTimeout(() => {
            requestRef.off('value');
            if (locationBtn) {
                locationBtn.disabled = false;
                locationBtn.textContent = 'Request Location';
            }
            UIUtils.showToast('Location request timed out', 'error');
        }, 30000);

    } catch (error) {
        console.error('Error requesting location update:', error);
        UIUtils.showToast('Error requesting location update', 'error');
        locationBtn.disabled = false;
        locationBtn.textContent = 'Request Location';
    }
}
