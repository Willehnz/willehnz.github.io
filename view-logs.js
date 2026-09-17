// Core imports
import { getVersionDisplay } from './src/core/version.js';
import { getHighAccuracyPosition, determineLocationSource } from './src/features/location/location-tracker.js';
import { 
    authenticateAdmin, 
    signOutAdmin, 
    onAuthStateChanged,
    initSession 
} from './src/core/auth.js';
import { logger } from './src/utils/logger.js';

// Pre-load modules
const modulePromises = {
    admin: import('./src/features/admin/admin.js'),
    map: import('./src/features/admin/map-handler.js'),
    theme: import('./src/features/theme/theme-manager.js')
};

// Firebase ready promise
const firebaseReady = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        reject(new Error('Firebase initialization timeout'));
    }, 15000);

    const checkFirebase = () => {
        if (window.firebaseLoaded && window.database) {
            clearTimeout(timeout);
            resolve();
        } else {
            setTimeout(checkFirebase, 100);
        }
    };
    checkFirebase();
});

// Initialize version display
function initializeVersion() {
    const versionElement = document.getElementById('versionDisplay');
    if (versionElement) {
        versionElement.textContent = getVersionDisplay();
    }
}

// Show login error
function showLoginError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Hide login error
function hideLoginError() {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Show main content
function showMainContent() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
}

// Handle logout
async function handleLogout() {
    await signOutAdmin();
    showLoginScreen();
    logger.info('User logged out');
}

// Handle session timeout
function handleSessionTimeout() {
    logger.info('Session timed out');
    alert('Session expired due to inactivity. Please log in again.');
    handleLogout();

// Theme preview functionality
function setupThemePreview() {
    const previewBtn = document.getElementById('previewThemeBtn');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const previewModal = document.getElementById('themePreviewModal');
    const previewFrame = document.getElementById('themePreviewFrame');
    const themeSelect = document.getElementById('themeSelect');
    
    if (!previewBtn || !previewModal || !previewFrame) return;
    
    previewBtn.addEventListener('click', () => {
        const selectedTheme = themeSelect.value;
        // Load the index page in the iframe with the selected theme
        previewFrame.src = `index.html?preview=${selectedTheme}`;
        previewModal.style.display = 'flex';
    });
    
    closePreviewBtn.addEventListener('click', () => {
        previewModal.style.display = 'none';
        previewFrame.src = '';
    });
    
    // Close on overlay click
    const overlay = previewModal.querySelector('.theme-preview-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            previewModal.style.display = 'none';
            previewFrame.src = '';
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewModal.style.display === 'flex') {
            previewModal.style.display = 'none';
            previewFrame.src = '';
        }
    });
}


// Listen for location requests and handle updates
function listenForLocationRequests() {
    const requestsRef = window.database.ref('locationRequests');
    
    requestsRef.on('child_added', async (snapshot) => {
        const request = snapshot.val();
        if (!request || request.status !== 'pending') return;

        try {
            const position = await getHighAccuracyPosition();
            const locationSource = await determineLocationSource(position);
            
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                locationSource: locationSource
            };

            await snapshot.ref.update({
                status: 'completed',
                newLocation: locationData,
                completedAt: firebase.database.ServerValue.TIMESTAMP
            });

            logger.info('Location update sent successfully');
        } catch (error) {
            logger.error('Failed to get location for update:', error);
            await snapshot.ref.update({
                status: 'failed',
                error: error.message,
                completedAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
    });
}

// Handle theme change
async function handleThemeChange(event) {
    const themeName = event.target.value;
    
    try {
        await firebaseReady;
        await window.database.ref('activeTheme').set(themeName);
        logger.info('Theme changed to:', themeName);
    } catch (error) {
        logger.error('Failed to change theme:', error);
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = `Failed to update theme: ${error.message}`;
            toast.className = 'toast show error';
            setTimeout(() => {
                toast.className = 'toast';
            }, 5000);
        }
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    hideLoginError();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';
    
    try {
        await authenticateAdmin(email, password);
        logger.info('Login successful');
        
        await firebaseReady;
        
        const [{ initializeAdmin }, { refreshMap }, { initializeTheme }] = await Promise.all([
            modulePromises.admin,
            modulePromises.map,
            modulePromises.theme
        ]);

        await initializeTheme();
        await initializeAdmin();
        initializeVersion();
        listenForLocationRequests();
        initSession(handleSessionTimeout);
        setTimeout(refreshMap, 100);
        
        showMainContent();
        
    } catch (error) {
        logger.error('Login failed:', error);
        showLoginError(error.message);
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
}

// Initialize admin interface
document.addEventListener('DOMContentLoaded', () => {
    logger.debug('DOM loaded, setting up admin interface');
    
    // Check if already authenticated (session persistence)
    onAuthStateChanged(async (user) => {
        if (user) {
            logger.debug('User already authenticated, restoring session');
            try {
                await firebaseReady;
                
                const [{ initializeAdmin }, { refreshMap }, { initializeTheme }] = await Promise.all([
                    modulePromises.admin,
                    modulePromises.map,
                    modulePromises.theme
                ]);
                
                await initializeTheme();
                await initializeAdmin();
                initializeVersion();
                listenForLocationRequests();
                initSession(handleSessionTimeout);
                setTimeout(refreshMap, 100);
                
                showMainContent();
            } catch (error) {
                logger.error('Failed to restore session:', error);
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }
    });
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', handleThemeChange);
    }
    
    // Setup theme preview
    setupThemePreview();
});
}