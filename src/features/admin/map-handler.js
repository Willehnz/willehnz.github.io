import { createMarkerPopup } from './ui-utils.js';
import { logger } from '../../utils/logger.js';

let map;
let markers = [];
let mapInitialized = false;

export function initMap() {
    try {
        logger.debug('Initializing map...');
        const mapContainer = document.getElementById('locationMap');
        if (!mapContainer) {
            logger.warn('Map container not found, will retry when visible');
            return null;
        }

        // Check if map is already initialized
        if (map && mapInitialized) {
            logger.debug('Map already initialized, returning existing instance');
            return map;
        }

        // Ensure container has dimensions before initializing
        const rect = mapContainer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            logger.debug('Map container has no dimensions, deferring init');
            return null;
        }

        // Initialize the map with a default view (centered on New Zealand)
        map = L.map('locationMap', {
            minZoom: 2,
            maxZoom: 18
        }).setView([-41.2866, 174.7756], 5);
        
        // Add the tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        mapInitialized = true;

        // Force multiple resize checks to ensure proper rendering
        setTimeout(() => map.invalidateSize(), 100);
        setTimeout(() => map.invalidateSize(), 300);
        setTimeout(() => map.invalidateSize(), 500);
        
        logger.debug('Map initialized successfully');
        return map;
    } catch (error) {
        logger.error('Error initializing map:', error);
        throw error;
    }
}

// Ensure map is initialized when container becomes visible
export function ensureMapReady() {
    if (!map || !mapInitialized) {
        initMap();
    }
    if (map) {
        map.invalidateSize();
    }
    return map;
}

export function clearMarkers() {
    try {
        logger.debug('Clearing markers...');
        markers.forEach(marker => {
            if (map && marker) {
                map.removeLayer(marker);
            }
        });
        markers = [];
    } catch (error) {
        logger.error('Error clearing markers:', error);
    }
}

export function addMarker(latitude, longitude, data) {
    try {
        if (!map) {
            logger.error('Map not initialized');
            return null;
        }

        logger.debug('Adding marker at:', latitude, longitude);
        const marker = L.marker([latitude, longitude])
            .bindPopup(createMarkerPopup(data))
            .addTo(map);
        markers.push(marker);
        return marker;
    } catch (error) {
        logger.error('Error adding marker:', error);
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
        logger.error('Error removing marker:', error);
    }
}

export function focusLocation(latitude, longitude, openPopup = false) {
    try {
        if (!map) {
            logger.error('Map not initialized');
            return;
        }

        logger.debug('Focusing location:', latitude, longitude);

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
        logger.error('Error focusing location:', error);
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
            logger.debug('Map size refreshed');
        }, 100);
    }
}
