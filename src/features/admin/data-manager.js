import { getDatabase } from '../../core/firebase-init.js';

export async function fetchLocations() {
    const database = getDatabase();
    try {
        const snapshot = await database.ref('locations')
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
        return locations;
    } catch (error) {
        console.error('Error fetching locations:', error);
        throw error;
    }
}

export async function deleteLocation(locationKey) {
    const database = getDatabase();
    try {
        await database.ref('locations/' + locationKey).remove();
        return true;
    } catch (error) {
        console.error('Error deleting location:', error);
        throw error;
    }
}

export async function requestLocationUpdate(locationKey) {
    const database = getDatabase();
    try {
        const requestRef = database.ref('locationRequests').push();
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

export async function updateTheme(themeName) {
    const database = getDatabase();
    try {
        await database.ref('activeTheme').set(themeName);
        return true;
    } catch (error) {
        console.error('Error updating theme:', error);
        throw error;
    }
}

export async function getCurrentTheme() {
    const database = getDatabase();
    try {
        const snapshot = await database.ref('activeTheme').once('value');
        return snapshot.val() || 'westpac';
    } catch (error) {
        console.error('Error loading theme:', error);
        throw error;
    }
}
