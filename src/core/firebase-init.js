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

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Test database connection
const connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snapshot) => {
    const isConnected = snapshot.val();
    console.log('Database connection state:', isConnected);
    if (!isConnected && document.visibilityState !== 'hidden') {
        console.warn('Attempting to reconnect to Firebase...');
    }
});

// Make database available globally
window.database = database;

// Test write permission
const testRef = database.ref('test-write');
testRef.set({
    timestamp: firebase.database.ServerValue.TIMESTAMP
}).then(() => {
    console.log('Write permission verified');
    testRef.remove();
}).catch(error => {
    console.error('Firebase initialization error:', error);
});
