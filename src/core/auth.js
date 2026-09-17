import { logger } from '../../utils/logger.js';

// Session management
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute

let sessionTimer = null;
let loginAttempts = 0;
let lockoutUntil = 0;

// Rate limiting check
function checkRateLimit() {
    const now = Date.now();
    if (now < lockoutUntil) {
        const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
        throw new Error(`Too many failed attempts. Try again in ${remainingSeconds}s.`);
    }
}

// Record a failed login attempt
function recordFailedAttempt() {
    loginAttempts++;
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        loginAttempts = 0;
        logger.warn(`Login locked out for ${LOCKOUT_DURATION_MS / 1000}s`);
        throw new Error(`Too many failed attempts. Locked out for ${LOCKOUT_DURATION_MS / 1000} seconds.`);
    }
}

// Reset login attempts on success
function resetLoginAttempts() {
    loginAttempts = 0;
    lockoutUntil = 0;
}

// Session activity tracking
function resetSessionTimer(onTimeout) {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
    }
    sessionTimer = setTimeout(() => {
        logger.info('Session timed out due to inactivity');
        if (onTimeout) onTimeout();
    }, SESSION_TIMEOUT_MS);
}

// Track user activity to keep session alive
function setupActivityTracking(onTimeout) {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, () => resetSessionTimer(onTimeout), { passive: true });
    });
    resetSessionTimer(onTimeout);
}

// Clear session timer
function clearSessionTimer() {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
        sessionTimer = null;
    }
}

// Authenticate with Firebase using email/password
export async function authenticateAdmin(email, password) {
    checkRateLimit();
    
    try {
        const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
        resetLoginAttempts();
        logger.info('Admin authenticated successfully');
        return credential.user;
    } catch (error) {
        recordFailedAttempt();
        logger.error('Authentication failed:', error.code);
        
        // Map Firebase error codes to user-friendly messages
        switch (error.code) {
            case 'auth/invalid-email':
                throw new Error('Invalid email address.');
            case 'auth/user-disabled':
                throw new Error('This account has been disabled.');
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                throw new Error('Invalid email or password.');
            case 'auth/too-many-requests':
                throw new Error('Too many attempts. Please try again later.');
            default:
                throw new Error('Authentication failed. Please try again.');
        }
    }
}

// Sign out
export async function signOutAdmin() {
    clearSessionTimer();
    try {
        await firebase.auth().signOut();
        logger.info('Admin signed out');
    } catch (error) {
        logger.error('Sign out error:', error);
    }
}

// Check if user is currently authenticated
export function isAuthenticated() {
    return firebase.auth().currentUser !== null;
}

// Get current user
export function getCurrentUser() {
    return firebase.auth().currentUser;
}

// Listen for auth state changes
export function onAuthStateChanged(callback) {
    return firebase.auth().onAuthStateChanged(callback);
}

// Initialize session management
export function initSession(onTimeout) {
    setupActivityTracking(onTimeout);
}

// Get remaining session time (for display)
export function getSessionRemainingMs() {
    return SESSION_TIMEOUT_MS;
}