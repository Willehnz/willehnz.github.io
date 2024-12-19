import { getDeviceInfo } from '../../utils/browser-detection.js';

// Helper function to determine location source
export async function determineLocationSource(position) {
    console.log('Determining location source for position:', position);
    
    if ('permissions' in navigator) {
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            console.log('Geolocation permission state:', result.state);
            
            if (result.state === 'granted') {
                if (position.coords.accuracy < 100) {
                    console.log('High accuracy GPS detected');
                    return 'GPS (High Accuracy)';
                }
                else if (position.coords.accuracy < 500) {
                    console.log('Low accuracy GPS detected');
                    return 'GPS (Low Accuracy)';
                }
            }
        } catch (e) {
            console.error('Error checking permissions:', e);
        }
    }
    
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

// Helper function to check if locations are significantly different
function isLocationDifferent(oldLoc, newLoc, minDistance = 100) {
    // Calculate distance in meters using Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = oldLoc.latitude * Math.PI/180;
    const φ2 = newLoc.latitude * Math.PI/180;
    const Δφ = (newLoc.latitude - oldLoc.latitude) * Math.PI/180;
    const Δλ = (newLoc.longitude - oldLoc.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance > minDistance;
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

            // Check if new location is significantly different
            const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            if (!isLocationDifferent(
                { latitude: originalLocation.latitude, longitude: originalLocation.longitude },
                newLocation
            )) {
                throw new Error('No significant location change detected (less than 100m difference)');
            }

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
            let errorMessage = 'Failed to update location';
            
            // Specific error messages
            if (error.code === 1) {
                errorMessage = 'Location access was denied by the user';
            } else if (error.code === 2) {
                errorMessage = 'Location is not available';
            } else if (error.code === 3) {
                errorMessage = 'Location request timed out';
            } else if (error.message.includes('No significant location change')) {
                errorMessage = error.message;
            }

            await snapshot.ref.update({
                status: 'failed',
                error: errorMessage,
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
