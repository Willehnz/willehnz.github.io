import { getDeviceInfo } from '../../utils/browser-detection.js';

// Helper function to determine location source
export async function determineLocationSource(position) {
    console.log('Determining location source for position:', position);
    
    // Check if high accuracy is available
    if ('permissions' in navigator) {
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            console.log('Geolocation permission state:', result.state);
            
            if (result.state === 'granted') {
                // Check for high accuracy GPS
                if (position.coords.accuracy < 100) {
                    console.log('High accuracy GPS detected');
                    return 'GPS (High Accuracy)';
                }
                // Check for low accuracy GPS
                else if (position.coords.accuracy < 500) {
                    console.log('Low accuracy GPS detected');
                    return 'GPS (Low Accuracy)';
                }
            }
        } catch (e) {
            console.error('Error checking permissions:', e);
        }
    }
    
    // If no permission info, use accuracy-based detection
    console.log('Using accuracy-based detection. Accuracy:', position.coords.accuracy);
    
    if (position.coords.accuracy < 100) {
        return 'GPS (High Accuracy)';
    }
    else if (position.coords.accuracy < 500) {
        return 'GPS (Low Accuracy)';
    }
    else if (position.coords.accuracy < 2000) {
        return 'WiFi';
    }
    else if (position.coords.accuracy < 5000) {
        return 'Cell Tower';
    }
    return 'IP-Based';
}

// Helper function to get high accuracy position
async function getHighAccuracyPosition() {
    return new Promise((resolve, reject) => {
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
}

// Listen for location requests
export function listenForLocationRequests() {
    if (!navigator.geolocation || !window.database) return;

    const requestsRef = window.database.ref('locationRequests');
    
    requestsRef.on('child_added', async (snapshot) => {
        const request = snapshot.val();
        if (!request || request.status !== 'pending') return;

        try {
            // Get the original location to update
            const locationRef = window.database.ref('locations/' + request.locationKey);
            const locationSnapshot = await locationRef.once('value');
            const originalLocation = locationSnapshot.val();
            if (!originalLocation) {
                throw new Error('Original location not found');
            }

            // Request new high accuracy position
            const position = await getHighAccuracyPosition();
            const locationSource = await determineLocationSource(position);
            console.log('Location source for update:', locationSource);

            // Create new location entry
            const locationsRef = window.database.ref('locations');
            const newLocationRef = locationsRef.push();
            const timestamp = new Date().toISOString();

            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                locationSource: locationSource,
                timestamp: timestamp,
                status: 'active',
                isLocationUpdate: true,
                previousLocationKey: request.locationKey,
                ip: originalLocation.ip,
                userAgent: navigator.userAgent,
                ...getDeviceInfo()
            };

            // Save the new location
            await newLocationRef.set(locationData);

            // Update the request status
            await snapshot.ref.update({
                status: 'completed',
                newLocation: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    locationSource: locationSource
                },
                completedAt: timestamp
            });

            // Update the original location to mark it as having an update
            await locationRef.update({
                hasUpdate: true,
                latestUpdateKey: newLocationRef.key
            });

        } catch (error) {
            console.error('Error updating location:', error);
            await snapshot.ref.update({
                status: 'failed',
                error: error.message,
                failedAt: new Date().toISOString()
            });
        }
    });
}

// Handle page unload/close
export function setupUnloadHandler() {
    window.addEventListener('beforeunload', async () => {
        try {
            const ip = await fetch('https://api.ipify.org?format=json')
                .then(response => response.json())
                .then(data => data.ip)
                .catch(() => null);
                
            if (ip && window.database) {
                const locationsRef = window.database.ref('locations');
                const locationQuery = locationsRef.orderByChild('ip').equalTo(ip);
                const snapshot = await locationQuery.once('value');
                
                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    if (data.status === 'active') {
                        childSnapshot.ref.update({ status: 'inactive' });
                    }
                });
            }
        } catch (error) {
            console.error('Error updating status on page close:', error);
        }
    });
}
