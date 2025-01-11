import { applyContent, validateThemeContent } from './content-manager.js';
import { updateFormForTheme } from '../form/form-handler.js';

// Theme change states
const ThemeState = {
    IDLE: 'idle',
    CHANGING: 'changing',
    SUCCESS: 'success',
    ERROR: 'error'
};

let currentTheme = '';
let themeState = ThemeState.IDLE;
let changeTimeout;

export async function initializeTheme() {
    try {
        const database = window.database;
        if (!database) {
            throw new Error('Firebase database not initialized');
        }
        
        const themeRef = database.ref('activeTheme');
        const snapshot = await themeRef.once('value');
        const initialTheme = snapshot.val() || 'westpac';
        await applyTheme(initialTheme);

        // Enhanced theme change listener
        themeRef.on('value', async (snapshot) => {
            // Clear any existing timeout
            if (changeTimeout) {
                clearTimeout(changeTimeout);
            }
            const newTheme = snapshot.val() || 'westpac';
            
            // Update theme state and notify
            themeState = ThemeState.CHANGING;
            notifyThemeChange({
                theme: newTheme,
                state: ThemeState.CHANGING
            });

            try {
                if (newTheme !== currentTheme) {
                    await applyTheme(newTheme);
                    themeState = ThemeState.SUCCESS;
                    notifyThemeChange({
                        theme: newTheme,
                        state: ThemeState.SUCCESS
                    });
                } else {
                    // Theme hasn't changed but still notify
                    themeState = ThemeState.SUCCESS;
                    notifyThemeChange({
                        theme: newTheme,
                        state: ThemeState.SUCCESS,
                        unchanged: true
                    });
                }
            } catch (error) {
                themeState = ThemeState.ERROR;
                notifyThemeChange({
                    theme: newTheme,
                    state: ThemeState.ERROR,
                    error: error.message
                });
                
                // Set timeout to retry
                changeTimeout = setTimeout(() => {
                    if (themeState === ThemeState.ERROR) {
                        themeRef.once('value').then(snapshot => {
                            const currentThemeValue = snapshot.val() || 'westpac';
                            applyTheme(currentThemeValue).catch(console.error);
                        });
                    }
                }, 5000);
            }
        });
    } catch (error) {
        console.error('Failed to initialize theme:', error);
        // Fallback to default theme if Firebase fails
        await applyTheme('westpac');
    }
}

export async function applyTheme(themeName) {
    try {
        const theme = window.themes[themeName];
        if (!theme) {
            throw new Error(`Theme '${themeName}' not found`);
        }

        // Validate theme content if we're on the index page
        const isAdminPanel = document.querySelector('#loginScreen') !== null;
        if (!isAdminPanel && theme.content && !validateThemeContent(theme.content)) {
            throw new Error(`Theme '${themeName}' has invalid content structure`);
        }

        currentTheme = themeName;
        
        // Apply styles
        await applyStyles(theme);
        
        // Apply content only on index page
        if (!isAdminPanel) {
            await applyContent(theme);
            // Update form fields for the new theme
            await updateFormForTheme(theme);
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

        return true;
    } catch (error) {
        console.error('Error applying theme:', error);
        throw error;
    }
}

async function applyStyles(theme) {
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

function notifyThemeChange(detail) {
    // Create theme change event with enhanced details
    const event = new CustomEvent('themeChanged', {
        detail: {
            theme: detail.theme,
            state: detail.state,
            success: detail.state === ThemeState.SUCCESS,
            error: detail.error,
            unchanged: detail.unchanged || false,
            timestamp: Date.now()
        }
    });
    
    // Update UI feedback based on state
    const toast = document.getElementById('toast');
    const themeSelect = document.getElementById('themeSelect');
    
    if (toast && themeSelect) {
        switch (detail.state) {
            case ThemeState.CHANGING:
                toast.textContent = 'Updating theme...';
                toast.className = 'toast show';
                themeSelect.disabled = true;
                themeSelect.style.opacity = '0.7';
                break;
                
            case ThemeState.SUCCESS:
                if (detail.unchanged) {
                    toast.textContent = `Theme already set to ${detail.theme}`;
                } else {
                    toast.textContent = 'Theme updated successfully';
                }
                toast.className = 'toast show success';
                themeSelect.disabled = false;
                themeSelect.style.opacity = '1';
                
                // Auto-hide success message
                setTimeout(() => {
                    toast.className = 'toast';
                }, 3000);
                break;
                
            case ThemeState.ERROR:
                toast.textContent = `Failed to update theme: ${detail.error}`;
                toast.className = 'toast show error';
                themeSelect.disabled = false;
                themeSelect.style.opacity = '1';
                
                // Auto-hide error message after longer delay
                setTimeout(() => {
                    toast.className = 'toast';
                }, 5000);
                break;
        }
    }
    
    // Dispatch event
    window.dispatchEvent(event);
}
