import { firebaseReady } from './src/core/firebase-init.js';
import { initializeTheme } from './src/features/theme/theme-manager.js';
import { listenForLocationRequests, setupUnloadHandler } from './src/features/location/location-tracker.js';

// Initialize Firebase and load theme
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Firebase to be ready
        await firebaseReady;
        
        // Initialize theme system
        await initializeTheme();

        // Setup location request listener
        listenForLocationRequests();

        // Setup unload handler
        setupUnloadHandler();
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
