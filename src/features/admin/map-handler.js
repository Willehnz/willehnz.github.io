let map;
let markers = [];

export function initMap() {
    try {
        map = L.map('locationMap').setView([0, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        return map;
    } catch (error) {
        console.error('Error initializing map:', error);
        throw error;
    }
}

export function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

export function addMarker(latitude, longitude, popupContent) {
    try {
        const marker = L.marker([latitude, longitude])
            .bindPopup(popupContent)
            .addTo(map);
        markers.push(marker);
        return marker;
    } catch (error) {
        console.error('Error adding marker:', error);
        throw error;
    }
}

export function removeMarker(latitude, longitude) {
    const markerIndex = markers.findIndex(m => 
        m.getLatLng().lat === latitude && 
        m.getLatLng().lng === longitude
    );
    if (markerIndex > -1) {
        map.removeLayer(markers[markerIndex]);
        markers.splice(markerIndex, 1);
    }
}

export function focusLocation(latitude, longitude, openPopup = false) {
    try {
        map.fitBounds([[latitude, longitude]], {
            maxZoom: 16,
            padding: [50, 50]
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
        throw error;
    }
}

export function getMap() {
    return map;
}
