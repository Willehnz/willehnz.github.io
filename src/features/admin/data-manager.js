// Fetch locations from Firebase
export async function fetchLocations() {
    try {
        if (!window.database) {
            throw new Error('Firebase database not initialized');
        }

        console.log('Fetching locations from Firebase...');
        const locationsRef = window.database.ref('locations');
        const snapshot = await locationsRef
            .orderByChild('timestamp')
            .limitToLast(100)
            .once('value');
        
        const locations = [];
        snapshot.forEach(childSnapshot => {
            locations.push({
                key: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        console.log('Fetched locations:', locations);
        return locations;
    } catch (error) {
        console.error('Error fetching locations:', error);
        throw error;
    }
}

// Delete location
export async function deleteLocation(locationKey) {
    try {
        if (!window.database) {
            throw new Error('Firebase database not initialized');
        }

        await window.database.ref('locations/' + locationKey).remove();
        return true;
    } catch (error) {
        console.error('Error deleting location:', error);
        throw error;
    }
}

// Request location update
export async function requestLocationUpdate(locationKey) {
    try {
        if (!window.database) {
            throw new Error('Firebase database not initialized');
        }

        const requestRef = window.database.ref('locationRequests').push();
        await requestRef.set({
            locationKey: locationKey,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'pending'
        });
        return requestRef;
    } catch (error) {
        console.error('Error requesting location update:', error);
        throw error;
    }
}

// Update theme
export async function updateTheme(themeName) {
    try {
        if (!window.database) {
            throw new Error('Firebase database not initialized');
        }

        await window.database.ref('activeTheme').set(themeName);
        return true;
    } catch (error) {
        console.error('Error updating theme:', error);
        throw error;
    }
}

// Get current theme
export async function getCurrentTheme() {
    try {
        if (!window.database) {
            throw new Error('Firebase database not initialized');
        }

        const snapshot = await window.database.ref('activeTheme').once('value');
        return snapshot.val() || 'westpac';
    } catch (error) {
        console.error('Error loading theme:', error);
        throw error;
    }
}
