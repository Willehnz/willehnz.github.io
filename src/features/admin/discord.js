import { logger } from '../../utils/logger.js';

// Firebase Cloud Function URLs for Discord notifications
// These bypass CORS by routing through Firebase Functions
// Update these URLs after deploying Firebase Functions with: firebase deploy --only functions
const FUNCTIONS_BASE_URL = 'https://us-central1-pheesh-4481e.cloudfunctions.net';
const TEST_DISCORD_URL = `${FUNCTIONS_BASE_URL}/sendTestDiscord`;
const SEND_NOTIFICATION_URL = `${FUNCTIONS_BASE_URL}/sendDiscordNotificationHttp`;

/**
 * Send a Discord notification when a new location is received
 * Routes through Firebase Cloud Function to bypass CORS
 * Note: The onNewLocation trigger in functions/index.js handles this automatically
 * This function is kept for manual notifications from the admin panel
 */
export async function sendLocationNotification(locationData) {
    try {
        logger.debug('Sending location notification via Firebase Function...');
        
        const response = await fetch(SEND_NOTIFICATION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locationData)
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `API error: ${response.status}`);
        }

        logger.info('Discord notification sent successfully');
        return true;
    } catch (error) {
        logger.error('Failed to send Discord notification:', error);
        return false;
    }
}

/**
 * Send a test notification to verify the webhook works
 * Routes through Firebase Cloud Function to bypass CORS
 */
export async function sendTestNotification() {
    try {
        logger.debug('Sending test notification via Firebase Function...');
        
        const response = await fetch(TEST_DISCORD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `API error: ${response.status}`);
        }

        logger.info('Test notification sent successfully');
        return true;
    } catch (error) {
        logger.error('Failed to send test notification:', error);
        return false;
    }
}