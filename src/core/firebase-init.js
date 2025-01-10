// Initialize Firebase after SDK loads
window.firebaseLoaded = window.firebaseLoaded.then(async () => {
    if (!firebase) {
        throw new Error('Firebase SDK not loaded');
    }

    // Initialize Firebase with persistence disabled for faster startup
    const app = firebase.initializeApp(firebaseConfig);
    
    // Configure database settings
    firebase.database().setPersistenceEnabled(false);

    // Initialize database with retry logic
    const database = firebase.database();
    let retryCount = 0;
    const maxRetries = 3;
    
    // Make database available globally
    window.database = database;

    // Enhanced connection monitoring
    const connectedRef = database.ref('.info/connected');
    let connectionTimeout;
    let isConnected = false;

    // Connection state handler
    const handleConnectionState = (snapshot) => {
        clearTimeout(connectionTimeout);
        isConnected = snapshot.val() === true;
        console.log('Database connection state:', isConnected);
        
        if (!isConnected && document.visibilityState !== 'hidden') {
            console.warn('Connection lost - attempting to reconnect...');
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retry attempt ${retryCount} of ${maxRetries}`);
                database.goOnline(); // Force reconnection attempt
            } else {
                console.error('Max retries reached - please refresh the page');
            }
        } else if (isConnected) {
            retryCount = 0; // Reset retry count on successful connection
            console.log('Connection restored');
        }
    };

    // Set up connection monitoring
    connectedRef.on('value', handleConnectionState);
    
    // Initial connection timeout
    connectionTimeout = setTimeout(() => {
        if (!isConnected) {
            console.warn('Initial connection timeout - attempting to proceed...');
            database.goOnline(); // Force connection attempt
        }
    }, 10000); // Longer initial timeout

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
