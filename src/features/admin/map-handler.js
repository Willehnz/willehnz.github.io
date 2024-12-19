import { createMarkerPopup } from './ui-utils.js';

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

export function addMarker(latitude, longitude, data) {
    try {
        if (!map) {
            console.error('Map not initialized');
            return null;
        }

        console.log('Adding marker at:', latitude, longitude);
        const marker = L.marker([latitude, longitude])
            .bindPopup(createMarkerPopup(data))
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

        // Center map on location with specific zoom level
        map.setView([latitude, longitude], 15, {
            animate: true,
            duration: 0.5,
            // Center the marker in the middle of the visible map area
            paddingTopLeft: [0, 0],
            paddingBottomRight: [0, 0]
        });

        if (openPopup) {
            const marker = markers.find(m => 
                m.getLatLng().lat === latitude && 
                m.getLatLng().lng === longitude
            );
            if (marker) {
                // Wait for pan/zoom to complete before opening popup
                setTimeout(() => {
                    marker.openPopup();
                }, 600);
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
