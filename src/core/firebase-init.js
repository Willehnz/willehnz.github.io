import { logger } from '../utils/logger.js';

// Create Firebase loaded promise
window.firebaseLoaded = new Promise((resolve) => {
    // Check if Firebase SDK is already loaded
    if (typeof firebase !== 'undefined') {
        resolve();
    } else {
        // Wait for Firebase SDK to load
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined') {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    }
});

// Initialize Firebase after SDK loads
window.firebaseLoaded.then(async () => {
    if (!firebase) {
        throw new Error('Firebase SDK not loaded');
    }

    // Prevent double-initialization
    if (firebase.apps.length > 0) {
        logger.debug('Firebase already initialized, skipping');
        window.database = firebase.database();
        return;
    }

    // Initialize Firebase
    const app = firebase.initializeApp(window.firebaseConfig);

    // Initialize database
    const database = firebase.database();
    let retryCount = 0;
    const maxRetries = 3;
    
    // Make database available globally
    window.database = database;

    // Wait for database connection
    await new Promise((resolve, reject) => {
        const connectedRef = database.ref('.info/connected');
        const timeout = setTimeout(() => {
            reject(new Error('Database connection timeout'));
        }, 10000);

        connectedRef.on('value', (snapshot) => {
            const isConnected = snapshot.val() === true;
            logger.debug('Database connection state:', isConnected);
            
            if (isConnected) {
                clearTimeout(timeout);
                resolve();
            } else if (document.visibilityState !== 'hidden') {
                logger.warn('Connection lost - attempting to reconnect...');
                if (retryCount < maxRetries) {
                    retryCount++;
                    logger.debug(`Retry attempt ${retryCount} of ${maxRetries}`);
                    database.goOnline();
                } else {
                    clearTimeout(timeout);
                    reject(new Error('Max retries reached'));
                }
            }
        });
    });

    // Test write permission with retry
    const testWrite = async () => {
        const testRef = database.ref('test-write');
        const writeTimeout = setTimeout(() => {
            logger.warn('Write permission test timeout - proceeding in read-only mode');
        }, 5000);

        try {
            await testRef.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            clearTimeout(writeTimeout);
            logger.debug('Write permission verified');
            await testRef.remove();
            logger.info('Firebase initialization complete');
            return database;
        } catch (error) {
            clearTimeout(writeTimeout);
            if (retryCount < maxRetries) {
                retryCount++;
                logger.debug(`Retrying write test (${retryCount}/${maxRetries})`);
                return testWrite();
            }
            throw error;
        }
    };

    return testWrite().catch(error => {
        logger.error('Firebase initialization error:', error);
        throw error;
    });
}).catch(error => {
    logger.error('Failed to load Firebase:', error.message);
});
