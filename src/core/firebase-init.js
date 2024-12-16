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
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const database = firebase.database();
        console.log('Firebase initialized successfully');
        
        // Test database connection
        database.ref('.info/connected').on('value', (snapshot) => {
            const isConnected = snapshot.val();
            console.log('Database connection state:', isConnected);
            if (!isConnected && document.visibilityState !== 'hidden') {
                console.warn('Attempting to reconnect to Firebase...');
                database.goOnline();
            }
        });

        // Export database for use in other scripts
        window.database = database;

        // Test write permission
        database.ref('test-write').set({
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            console.log('Write permission verified');
            database.ref('test-write').remove();
            resolve(database);
        }).catch(reject);
    } catch (error) {
        console.error('Firebase initialization error:', error);
        reject(error);
    }
});

export const getDatabase = () => window.database;
