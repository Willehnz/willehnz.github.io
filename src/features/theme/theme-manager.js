import { applyContent, validateThemeContent } from './content-manager.js';

let currentTheme = '';

export async function initializeTheme() {
    try {
        // Use compat version consistently
        const database = window.database;
        if (!database) {
            throw new Error('Firebase database not initialized');
        }
        
        // Initial theme load
        const themeRef = database.ref('activeTheme');
        const snapshot = await themeRef.once('value');
        const initialTheme = snapshot.val() || 'westpac';
        applyTheme(initialTheme);

        // Listen for theme changes
        themeRef.on('value', (snapshot) => {
            const newTheme = snapshot.val() || 'westpac';
            if (newTheme !== currentTheme) {
                applyTheme(newTheme);
            }
        });
    } catch (error) {
        console.error('Failed to initialize theme:', error);
        // Fallback to default theme if Firebase fails
        applyTheme('westpac');
    }
}

export function applyTheme(themeName) {
    const theme = window.themes[themeName];
    if (!theme) {
        console.error(`Theme '${themeName}' not found`);
        return;
    }

    // Validate theme content if we're on the index page
    const isAdminPanel = document.querySelector('#loginScreen') !== null;
    if (!isAdminPanel && theme.content && !validateThemeContent(theme.content)) {
        console.error(`Theme '${themeName}' has invalid content structure`);
        return;
    }

    currentTheme = themeName;
    
    // Apply styles
    applyStyles(theme);
    
    // Apply content only on index page
    if (!isAdminPanel) {
        applyContent(theme);
    }

    // Show content after theme is loaded
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('loaded');
    }
}

function applyStyles(theme) {
    // Update theme elements if they exist (for main site)
    const themeStyles = document.getElementById('themeStyles');
    if (themeStyles) {
        themeStyles.href = theme.styles;
    }

    const logoImage = document.querySelector('.logo-image');
    if (logoImage) {
        logoImage.src = theme.logo;
    }

    // Update theme select if it exists (for admin panel)
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect && themeSelect.value !== theme.name) {
        themeSelect.value = theme.name;
    }

    // Update CSS variables
    document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
    document.documentElement.style.setProperty('--primary-hover', theme.secondaryColor);

    // Update title based on current page
    const isAdminPanel = document.querySelector('#loginScreen') !== null;
    document.title = isAdminPanel ? 'Location Logs - Admin View' : `Device Verification - ${theme.name}`;
}

export function getCurrentTheme() {
    return currentTheme;
}
