let map;
let markers = [];

export function initMap() {
    try {
        console.log('Initializing map...');
        const mapContainer = document.getElementById('locationMap');
        if (!mapContainer) {
            throw new Error('Map container not found');
        }

        // Check if map is already initialized
        if (map) {
            console.log('Map already initialized, returning existing instance');
            return map;
        }

        // Initialize the map with a default view
        map = L.map('locationMap', {
            minZoom: 2,
            maxZoom: 18
        }).setView([0, 0], 2);
        
        // Add the tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Force a resize to ensure proper rendering
        setTimeout(() => {
            map.invalidateSize();
            console.log('Map initialized successfully');
        }, 100);

        return map;
    } catch (error) {
        console.error('Error initializing map:', error);
        throw error;
    }
}

export function clearMarkers() {
    try {
        console.log('Clearing markers...');
        markers.forEach(marker => {
            if (map && marker) {
                map.removeLayer(marker);
            }
        });
        markers = [];
    } catch (error) {
        console.error('Error clearing markers:', error);
    }
}

export function addMarker(latitude, longitude, popupContent) {
    try {
        if (!map) {
            console.error('Map not initialized');
            return null;
        }

        console.log('Adding marker at:', latitude, longitude);
        const marker = L.marker([latitude, longitude])
            .bindPopup(popupContent)
            .addTo(map);
        markers.push(marker);
        return marker;
    } catch (error) {
        console.error('Error adding marker:', error);
        return null;
    }
}

export function removeMarker(latitude, longitude) {
    try {
        const markerIndex = markers.findIndex(m => 
            m.getLatLng().lat === latitude && 
            m.getLatLng().lng === longitude
        );
        if (markerIndex > -1) {
            if (map) {
                map.removeLayer(markers[markerIndex]);
            }
            markers.splice(markerIndex, 1);
        }
    } catch (error) {
        console.error('Error removing marker:', error);
    }
}

export function focusLocation(latitude, longitude, openPopup = false) {
    try {
        if (!map) {
            console.error('Map not initialized');
            return;
        }

        console.log('Focusing location:', latitude, longitude);
        
        // Create bounds with padding
        const bounds = L.latLngBounds([
            [latitude - 0.1, longitude - 0.1],
            [latitude + 0.1, longitude + 0.1]
        ]);
        
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 16,
            animate: true,
            duration: 1
        });

        if (openPopup) {
            const marker = markers.find(m => 
                m.getLatLng().lat === latitude && 
                m.getLatLng().lng === longitude
            );
            if (marker) {
                marker.openPopup();
            }
        }
    } catch (error) {
        console.error('Error focusing location:', error);
    }
}

export function getMap() {
    return map;
}

// Ensure map is properly sized when container becomes visible
export function refreshMap() {
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
            console.log('Map size refreshed');
        }, 100);
    }
}
