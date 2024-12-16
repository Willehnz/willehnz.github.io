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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

async function checkPassword() {
    const password = document.getElementById('password').value;
    const hash = await sha256(password);
    
    if (hash === PASSWORD_HASH) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        // Initialize map and load data after successful login
        if (typeof initMap === 'function') initMap();
        if (typeof refreshData === 'function') refreshData();
        
        // Start listening for location requests
        listenForLocationRequests();
    } else {
        alert('Incorrect password');
    }
}

// Prevent form submission and handle enter key
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await checkPassword();
});

// Listen for location requests and handle updates
function listenForLocationRequests() {
    const requestsRef = database.ref('locationRequests');
    
    requestsRef.on('child_added', async (snapshot) => {
        const request = snapshot.val();
        if (!request || request.status !== 'pending') return;

        try {
            // Get the original location data
            const locationSnapshot = await database.ref('locations/' + request.locationKey).once('value');
            const locationData = locationSnapshot.val();
            if (!locationData) {
                throw new Error('Location not found');
            }

            // Create a new location entry with the same data structure
            const newLocationRef = database.ref('locations').push();
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
            await database.ref('locations/' + request.locationKey).update({
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

// Export database for use in other scripts
window.database = database;
