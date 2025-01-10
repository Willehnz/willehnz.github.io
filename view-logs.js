// Core imports
import { getVersionDisplay } from './src/core/version.js';
import { getHighAccuracyPosition, determineLocationSource } from './src/features/location/location-tracker.js';

// Password hash (default password is "admin123")
const PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';  

// Pre-load modules
const modulePromises = {
    admin: import('./src/features/admin/admin.js'),
    map: import('./src/features/admin/map-handler.js'),
    theme: import('./src/features/theme/theme-manager.js')
};

// Firebase ready promise
const firebaseReady = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        reject(new Error('Firebase initialization timeout'));
    }, 15000); // Increased timeout for slower connections

    const checkFirebase = () => {
        // Check both Firebase SDK and database initialization
        if (window.firebaseLoaded && window.database) {
            clearTimeout(timeout);
            resolve();
        } else {
            setTimeout(checkFirebase, 100);
        }
    };
    checkFirebase();
});

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

// Add location quality indicator to UI
function updateLocationQualityIndicator(sourceDetails) {
    const qualityIndicator = document.getElementById('locationQualityIndicator') || 
        (() => {
            const indicator = document.createElement('div');
            indicator.id = 'locationQualityIndicator';
            indicator.className = 'quality-indicator';
            const mapPanel = document.querySelector('.map-panel');
            if (mapPanel) {
                mapPanel.appendChild(indicator);
            }
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

// Handle theme changes
async function handleThemeChange(event) {
    try {
        const newTheme = event.target.value;
        const database = window.database;
        if (!database) {
            throw new Error('Database not initialized');
        }

        // Update theme in Firebase
        await database.ref('activeTheme').set(newTheme);
        console.log('Theme updated:', newTheme);
    } catch (error) {
        console.error('Failed to update theme:', error);
        // Reset to current theme
        event.target.value = window.themes?.currentTheme || 'westpac';
        alert('Failed to update theme. Please try again.');
    }
}

async function checkPassword() {
    try {
        const password = document.getElementById('password').value;
        const hash = await sha256(password);
        
        if (hash === PASSWORD_HASH) {
            console.log('Login successful, showing main content');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            
            try {
                // Wait for Firebase and modules
                await firebaseReady;
                console.log('Firebase ready');

                // Get pre-loaded modules
                const [{ initializeAdmin }, { refreshMap }, { initializeTheme }] = await Promise.all([
                    modulePromises.admin,
                    modulePromises.map,
                    modulePromises.theme
                ]);
                console.log('Modules loaded');

                // Initialize theme first
                await initializeTheme();
                console.log('Theme initialized');

                // Initialize admin panel
                await initializeAdmin();
                console.log('Admin panel initialized');

                // Initialize version and start location requests
                initializeVersion();
                listenForLocationRequests();
                
                // Refresh map after everything is ready
                setTimeout(refreshMap, 100);
                
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

    // Add theme change listener
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', handleThemeChange);
    }
});
