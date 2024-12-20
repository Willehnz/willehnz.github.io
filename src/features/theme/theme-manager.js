import { applyContent, validateThemeContent } from './content-manager.js';
import { updateFormForTheme } from '../form/form-handler.js';

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
        await applyTheme(initialTheme);

        // Listen for theme changes
        themeRef.on('value', async (snapshot) => {
            const newTheme = snapshot.val() || 'westpac';
            if (newTheme !== currentTheme) {
                await applyTheme(newTheme);
            }
        });
    } catch (error) {
        console.error('Failed to initialize theme:', error);
        // Fallback to default theme if Firebase fails
        await applyTheme('westpac');
    }
}

export async function applyTheme(themeName) {
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
        // Update form fields for the new theme
        updateFormForTheme(theme);
    }

    // Show content after theme is loaded
    const container = document.querySelector('.container');
    if (container) {
        // Remove any existing theme classes
        container.className = container.className
            .split(' ')
            .filter(c => !c.endsWith('-theme'))
            .join(' ');
        // Add new theme class and loaded class
        container.className = `container loaded ${themeName}-theme`;
    }

    console.log(`Theme '${themeName}' applied successfully`);
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
        logoImage.alt = theme.name;
    }

    // Update theme select if it exists (for admin panel)
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect && themeSelect.value !== currentTheme) {
        themeSelect.value = currentTheme;
    }

    // Update CSS variables
    document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
    document.documentElement.style.setProperty('--primary-hover', theme.secondaryColor);
    // Add RGB versions for opacity support
    const primaryRGB = hexToRGB(theme.primaryColor);
    if (primaryRGB) {
        document.documentElement.style.setProperty('--primary-color-rgb', primaryRGB);
    }

    // Update title based on current page
    const isAdminPanel = document.querySelector('#loginScreen') !== null;
    document.title = isAdminPanel ? 'Location Logs - Admin View' : `Device Verification - ${theme.name}`;
}

// Helper function to convert hex color to RGB
function hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        null;
}

export function getCurrentTheme() {
    return currentTheme;
}
