// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyBqx_C7XqKjmgJqRHcXBW5K9zMGNBZyGDY",
    authDomain: "pheesh-4481e.firebaseapp.com",
    databaseURL: "https://pheesh-4481e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pheesh-4481e",
    storageBucket: "pheesh-4481e.appspot.com",
    messagingSenderId: "458791455321",
    appId: "1:458791455321:web:3a9b8e6f4b8e9f1b2c3d4e"
};

// Global promise for Firebase initialization
export const firebaseReady = new Promise((resolve, reject) => {
    try {
        const app = window.firebase.initializeApp(firebaseConfig);
        const database = window.firebase.getDatabase(app);
        console.log('Firebase initialized successfully');
        
        // Test database connection
        const connectedRef = database.ref(database, '.info/connected');
        database.onValue(connectedRef, (snapshot) => {
            const isConnected = snapshot.val();
            console.log('Database connection state:', isConnected);
            if (!isConnected && document.visibilityState !== 'hidden') {
                console.warn('Attempting to reconnect to Firebase...');
                // Note: goOnline() is not available in modular SDK
            }
        });

        // Export database for use in other scripts
        window.database = database;

        // Test write permission
        const testRef = database.ref(database, 'test-write');
        database.set(testRef, {
            timestamp: Date.now()
        }).then(() => {
            console.log('Write permission verified');
            database.remove(testRef);
            resolve(database);
        }).catch(reject);
    } catch (error) {
        console.error('Firebase initialization error:', error);
        reject(error);
    }
});

export const getDatabase = () => window.database;
