# Firebase Functions Setup Guide

This guide explains how to deploy the Firebase Cloud Functions that enable Discord webhook notifications.

## Why Firebase Functions?

Discord webhooks cannot be called directly from browser JavaScript due to CORS (Cross-Origin Resource Sharing) restrictions. The Firebase Functions act as a server-side proxy to send notifications to Discord.

## Prerequisites

1. **Node.js 18+** installed
2. **Firebase CLI** installed: `npm install -g firebase-tools`
3. Access to the Firebase project `pheesh-4481e`

## Setup Steps

### 1. Login to Firebase

```bash
firebase login
```

### 2. Install Function Dependencies

```bash
cd functions
npm install
```

### 3. Deploy Functions

```bash
firebase deploy --only functions
```

### 4. (Optional) Set Custom Discord Webhook URL

If you want to use a different Discord webhook than the default:

```bash
firebase functions:config:set discord.webhook_url="YOUR_DISCORD_WEBHOOK_URL"
firebase deploy --only functions
```

## Functions Deployed

| Function | Type | Purpose |
|----------|------|---------|
| `onNewLocation` | Database Trigger | Automatically sends Discord notification when new location is saved to Firebase |
| `sendTestDiscord` | HTTP Endpoint | Tests Discord webhook connection from admin panel |
| `sendDiscordNotification` | HTTP Endpoint | Manually sends notification for a specific location |

## Function URLs

After deployment, your functions will be available at:

- `https://us-central1-pheesh-4481e.cloudfunctions.net/sendTestDiscord`
- `https://us-central1-pheesh-4481e.cloudfunctions.net/sendDiscordNotification`

The `onNewLocation` trigger runs automatically and doesn't have a URL.

## Testing

1. Open the admin panel (`view-logs.html`)
2. Click the **"💬 Test Discord"** button in the top right
3. Check your Discord channel for the test notification

## Troubleshooting

### Functions not deploying?

1. Make sure you're logged in: `firebase login`
2. Check you have the right project: `firebase projects:list`
3. Set the project: `firebase use pheesh-4481e`

### Discord notifications not working?

1. Check Firebase Functions logs: `firebase functions:log`
2. Verify the webhook URL is correct
3. Make sure the Discord webhook hasn't been deleted/disabled

### CORS errors in browser console?

The functions already include CORS headers. If you still see errors:
1. Check the function deployed successfully
2. Verify the URL in `src/features/admin/discord.js` matches your project ID

## Files

- `functions/index.js` - Cloud Function code
- `functions/package.json` - Dependencies
- `firebase.json` - Firebase configuration
- `.firebaserc` - Project settings
- `src/features/admin/discord.js` - Frontend code that calls the functions
