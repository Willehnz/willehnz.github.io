import { createMarkerPopup } from "./ui-utils.js";
import { logger } from "../../utils/logger.js";

let map = null;
let markers = [];
let mapInitialized = false;

export function initMap() {
    const mapContainer = document.getElementById("locationMap");
    if (!mapContainer) { logger.warn("Map container not found"); return null; }
    if (map && mapInitialized) { map.invalidateSize(); return map; }

    const rect = mapContainer.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) {
        logger.debug("Map container too small:", rect.width, rect.height);
        return null;
    }

    try {
        logger.debug("Creating map instance...");
        if (map) { map.remove(); map = null; }

        map = L.map("locationMap", {
            center: [-41.2866, 174.7756],
            zoom: 5,
            minZoom: 2,
            maxZoom: 18
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "OpenStreetMap",
            maxZoom: 19
        }).addTo(map);

        mapInitialized = true;
        setTimeout(() => { if (map) map.invalidateSize(); }, 100);
        window.addEventListener("resize", () => { if (map) setTimeout(() => map.invalidateSize(), 100); });
        logger.info("Map created successfully");
        return map;
    } catch (error) {
        logger.error("Map creation error:", error);
        mapInitialized = false;
        return null;
    }
}

export function ensureMapReady() {
    if (!map || !mapInitialized) return initMap();
    map.invalidateSize();
    return map;
}

export function clearMarkers() {
    markers.forEach(m => { try { if (map) map.removeLayer(m); } catch(e){} });
    markers = [];
}

export function addMarker(lat, lng, data) {
    if (!map || !lat || !lng) return null;
    try {
        const marker = L.marker([lat, lng]).bindPopup(createMarkerPopup(data)).addTo(map);
        markers.push(marker);
        return marker;
    } catch (e) { logger.error("Add marker error:", e); return null; }
}

export function removeMarker(lat, lng) {
    if (!map || !lat || !lng) return;
    const idx = markers.findIndex(m => {
        const p = m.getLatLng();
        return Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001;
    });
    if (idx > -1) { try { map.removeLayer(markers[idx]); } catch(e){} markers.splice(idx, 1); }
}

export function focusLocation(lat, lng, openPopup = false) {
    if (!map) return;
    try {
        map.setView([lat, lng], 15, { animate: true });
        if (openPopup) {
            const m = markers.find(m => {
                const p = m.getLatLng();
                return Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001;
            });
            if (m) setTimeout(() => m.openPopup(), 300);
        }
    } catch (e) { logger.error("Focus error:", e); }
}

export function fitToMarkers() {
    if (!map || markers.length === 0) return;
    try {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1), { maxZoom: 12, animate: true });
    } catch (e) { logger.error("Fit bounds error:", e); }
}

export function getMap() { return map; }
export function refreshMap() { if (map) setTimeout(() => map.invalidateSize(), 50); }
export function forceMapInit() {
    mapInitialized = false;
    if (map) { try { map.remove(); } catch(e){} map = null; }
    return initMap();
}
