// Initialize Firebase after SDK loads
window.firebaseLoaded = window.firebaseLoaded.then(async () => {
    if (!firebase) {
        throw new Error('Firebase SDK not loaded');
    }

    // Initialize Firebase with persistence disabled for faster startup
    const app = firebase.initializeApp(firebaseConfig, {
        databaseAuthVariableOverride: null,
        persistence: false
    });

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
            console.log('Database connection state:', isConnected);
            
            if (isConnected) {
                clearTimeout(timeout);
                resolve();
            } else if (document.visibilityState !== 'hidden') {
                console.warn('Connection lost - attempting to reconnect...');
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retry attempt ${retryCount} of ${maxRetries}`);
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
            console.warn('Write permission test timeout - proceeding in read-only mode');
        }, 5000);

        try {
            await testRef.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            clearTimeout(writeTimeout);
            console.log('Write permission verified');
            await testRef.remove();
            console.log('Firebase initialization complete');
            return database;
        } catch (error) {
            clearTimeout(writeTimeout);
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying write test (${retryCount}/${maxRetries})`);
                return testWrite(); // Retry recursively
            }
            throw error;
        }
    };

    return testWrite().catch(error => {
        console.error('Firebase initialization error:', error);
        throw error;
    });
}).catch(error => {
    console.error('Failed to load Firebase:', error.message);
    console.error('Error details:', error);
    throw error;
});
