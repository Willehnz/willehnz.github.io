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

// Listen for location requests and handle updates
function listenForLocationRequests() {
    const requestsRef = window.database.ref('locationRequests');
    
    requestsRef.on('child_added', async (snapshot) => {
        const request = snapshot.val();
        if (!request || request.status !== 'pending') return;

        try {
            // Get the original location data
            const locationSnapshot = await window.database.ref('locations/' + request.locationKey).once('value');
            const locationData = locationSnapshot.val();
            if (!locationData) {
                throw new Error('Location not found');
            }

            // Create a new location entry with the same data structure
            const newLocationRef = window.database.ref('locations').push();
            const timestamp = new Date().toISOString();
            
            // Copy the original data but update timestamp and mark as an update
            const newLocationData = {
                ...locationData,
                timestamp: timestamp,
                previousLocationKey: request.locationKey,
                isLocationUpdate: true
            };

            // Save the new location
            await newLocationRef.set(newLocationData);

            // Update the request status
            await snapshot.ref.update({
                status: 'completed',
                newLocation: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    accuracy: locationData.accuracy
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
