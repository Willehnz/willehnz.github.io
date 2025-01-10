import { getVersionDisplay } from './src/core/version.js';

// Password hash (default password is "admin123")
const PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';  

function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);                    
    return crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    });
}

// Initialize version display
function initializeVersion() {
    const versionElement = document.getElementById('versionDisplay');
    if (versionElement) {
        versionElement.textContent = getVersionDisplay();
    }
}

// Import location tracking functionality
import { 
    getHighAccuracyPosition, 
    determineLocationSource,
    startLocationMonitoring,
    stopLocationMonitoring
} from './src/features/location/location-tracker.js';

// Add manual refresh and monitoring controls
function addLocationControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'location-controls';
    
    // Add monitor toggle
    const monitorToggle = document.createElement('div');
    monitorToggle.className = 'monitor-toggle';
    monitorToggle.innerHTML = `
        <input type="checkbox" id="monitorToggle">
        <label for="monitorToggle">Continuous Monitoring</label>
    `;
    
    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = `
        <span class="icon"></span>
        <span class="text">Update Location</span>
    `;
    
    controlsContainer.appendChild(monitorToggle);
    controlsContainer.appendChild(refreshButton);
    document.querySelector('#mainContent').appendChild(controlsContainer);
    
    // Setup event handlers
    const toggle = monitorToggle.querySelector('input');
    toggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
            try {
                await startLocationMonitoring(handleLocationUpdate);
            } catch (error) {
                console.error('Failed to start monitoring:', error);
                e.target.checked = false;
                alert(error.message);
            }
        } else {
            stopLocationMonitoring();
        }
    });
    
    refreshButton.addEventListener('click', async () => {
        if (refreshButton.classList.contains('updating')) return;
        
        refreshButton.classList.add('updating');
        try {
            const position = await getHighAccuracyPosition();
            await handleLocationUpdate(position);
            refreshButton.classList.remove('updating');
        } catch (error) {
            console.error('Failed to update location:', error);
            refreshButton.classList.remove('updating');
            alert(error.message);
        }
    });
}

// Handle location updates
async function handleLocationUpdate(position, error = null) {
    if (error) {
        console.error('Location error:', error);
        return;
    }
    
    if (!position) return;
    
    try {
        const locationSource = await determineLocationSource(position);
        updateLocationQualityIndicator(position.sourceDetails);
        
        // Create new location entry
        const newLocationRef = window.database.ref('locations').push();
        const timestamp = new Date().toISOString();
        
        const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            locationSource: locationSource,
            sourceDetails: position.sourceDetails,
            timestamp: timestamp,
            status: 'active'
        };
        
        await newLocationRef.set(locationData);
        console.log('Location updated successfully');
        
    } catch (error) {
        console.error('Error saving location update:', error);
    }
}

// Add location quality indicator to UI
function updateLocationQualityIndicator(sourceDetails) {
    const qualityIndicator = document.getElementById('locationQualityIndicator') || 
        (() => {
            const indicator = document.createElement('div');
            indicator.id = 'locationQualityIndicator';
            indicator.className = 'quality-indicator';
            document.querySelector('#mainContent').appendChild(indicator);
            return indicator;
        })();

    const qualityMap = {
        GPS: { High: 'Excellent', Low: 'Good' },
        WiFi: { High: 'Good', Low: 'Fair' },
        Cell: { High: 'Fair', Low: 'Poor' },
        IP: { High: 'Poor', Low: 'Poor' }
    };

    const quality = qualityMap[sourceDetails.type]?.[sourceDetails.accuracyLevel] || 'Unknown';
    const accuracy = Math.round(sourceDetails.accuracy);
    
    qualityIndicator.innerHTML = `
        <strong>Location Quality:</strong> ${quality}<br>
        <small>Source: ${sourceDetails.type}, Accuracy: ±${accuracy}m</small>
    `;
    qualityIndicator.className = `quality-indicator quality-${quality.toLowerCase()}`;
}

// Listen for location requests and handle updates
function listenForLocationRequests() {
    const requestsRef = window.database.ref('locationRequests');
    
    requestsRef.on('child_added', async (snapshot) => {
        const request = snapshot.val();
        if (!request || request.status !== 'pending') return;

        try {
            // Get fresh location using high accuracy positioning
            const position = await getHighAccuracyPosition();
            const locationSource = await determineLocationSource(position);
            
            // Create new location entry
            const newLocationRef = window.database.ref('locations').push();
            const timestamp = new Date().toISOString();
            
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                locationSource: locationSource,
                sourceDetails: position.sourceDetails,
                timestamp: timestamp,
                previousLocationKey: request.locationKey,
                isLocationUpdate: true,
                status: 'active'
            };

            // Save the new location
            await newLocationRef.set(locationData);

            // Update location quality indicator
            updateLocationQualityIndicator(position.sourceDetails);

            // Update the request status
            await snapshot.ref.update({
                status: 'completed',
                newLocation: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    locationSource: locationSource,
                    sourceDetails: position.sourceDetails
                },
                completedAt: timestamp
            });

            // Update the original location to mark it as having an update
            await window.database.ref('locations/' + request.locationKey).update({
                hasUpdate: true,
                latestUpdateKey: newLocationRef.key
            });

        } catch (error) {
            console.error('Error handling location request:', error);
            await snapshot.ref.update({
                status: 'failed',
                error: error.message,
                failedAt: new Date().toISOString()
            });
        }
    });
}

async function checkPassword() {
    try {
        const password = document.getElementById('password').value;
        const hash = await sha256(password);
        
        if (hash === PASSWORD_HASH) {
            console.log('Login successful, showing main content');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            
            // Import required modules
            const { initializeAdmin } = await import('./src/features/admin/admin.js');
            const { refreshMap } = await import('./src/features/admin/map-handler.js');
            const { initializeTheme } = await import('./src/features/theme/theme-manager.js');
            
            try {
                // Initialize theme system first
                await initializeTheme();
                console.log('Theme system initialized');
                
                // Initialize admin panel
                await initializeAdmin();
                console.log('Admin panel initialized');
                
                // Initialize version display
                initializeVersion();
                console.log('Version display initialized');
                
                // Add location controls
                addLocationControls();
                console.log('Location controls added');
                
                // Refresh map after container is visible
                setTimeout(() => {
                    refreshMap();
                    console.log('Map refreshed after login');
                }, 100);
                
                // Start listening for location requests
                listenForLocationRequests();
            } catch (error) {
                console.error('Error initializing systems:', error);
                alert('Error initializing admin interface. Please refresh the page.');
            }
        } else {
            alert('Incorrect password');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('Error during login. Please try again.');
    }
}

// Initialize admin interface
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up login form');
    
    // Add login form event listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await checkPassword();
        });
    } else {
        console.error('Login form not found');
    }

    // Show error if Firebase failed to initialize
    if (!window.database) {
        console.error('Firebase database not initialized');
        alert('Error initializing admin interface. Please refresh the page.');
    }
});
