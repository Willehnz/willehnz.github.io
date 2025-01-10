// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqx_C7XqKjmgJqRHcXBW5K9zMGNBZyGDY",
    authDomain: "pheesh-4481e.firebaseapp.com",
    databaseURL: "https://pheesh-4481e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pheesh-4481e",
    storageBucket: "pheesh-4481e.appspot.com",
    messagingSenderId: "458791455321",
    appId: "1:458791455321:web:3a9b8e6f4b8e9f1b2c3d4e"
};

// Initialize Firebase after SDK loads
window.firebaseLoaded.then(() => {
    // Initialize Firebase with persistence disabled for faster startup
    const app = firebase.initializeApp(firebaseConfig, {
        databaseAuthVariableOverride: null,
        persistence: false
    });

    // Initialize database with smaller cache size
    const database = firebase.database();
    database.setMaxListeners(5); // Reduce max listeners

    // Test database connection with timeout
    const connectedRef = database.ref('.info/connected');
    let connectionTimeout;

    connectedRef.on('value', (snapshot) => {
        clearTimeout(connectionTimeout);
        const isConnected = snapshot.val();
        console.log('Database connection state:', isConnected);
        
        if (!isConnected && document.visibilityState !== 'hidden') {
            console.warn('Attempting to reconnect to Firebase...');
        }
    });

    // Set connection timeout
    connectionTimeout = setTimeout(() => {
        console.warn('Database connection timeout - proceeding with degraded functionality');
        // Continue loading the app even if Firebase is slow
        window.database = database;
    }, 5000);

    // Make database available globally
    window.database = database;

    // Test write permission with timeout
    const testRef = database.ref('test-write');
    const writeTimeout = setTimeout(() => {
        console.warn('Write permission test timeout - proceeding with read-only mode');
    }, 3000);

    testRef.set({
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        clearTimeout(writeTimeout);
        console.log('Write permission verified');
        testRef.remove();
    }).catch(error => {
        clearTimeout(writeTimeout);
        console.error('Firebase initialization error:', error);
    });
}).catch(error => {
    console.error('Failed to load Firebase:', error);
});
