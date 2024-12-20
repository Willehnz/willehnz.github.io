// Helper function to safely update text content with validation
function updateTextContent(selector, text) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Element not found: ${selector}`);
        return false;
    }
    element.textContent = text;
    return element.textContent === text;
}

// Helper function to safely update HTML content with validation
function updateHTML(selector, html) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Element not found: ${selector}`);
        return false;
    }
    element.innerHTML = html;
    return true;
}

// Apply theme content to the page with validation
export async function applyContent(theme) {
    try {
        const content = theme.content;
        if (!content) {
            throw new Error('Theme content is missing');
        }

        const updates = [];

        // Update main content with validation
        updates.push(updateTextContent('h1', content.title));
        updates.push(updateTextContent('.message', content.message));
        updates.push(updateTextContent('.sub-message', content.subMessage));

        // Update security badges with validation
        if (content.badges) {
            const badgesHTML = content.badges.map(badge => `
                <div class="badge">
                    <span class="icon">${badge.icon}</span>
                    <span class="text">${badge.text}</span>
                </div>
            `).join('');
            updates.push(updateHTML('.security-badges', badgesHTML));
        }

        // Update info box with validation
        if (content.infoBox) {
            const infoBoxHTML = `
                <p>${content.infoBox.title}</p>
                <ul>
                    ${content.infoBox.points.map(point => 
                        `<li>${point}</li>`
                    ).join('')}
                </ul>
            `;
            updates.push(updateHTML('.info-box', infoBoxHTML));
        }

        // Update footer with validation
        if (content.footer) {
            updates.push(updateTextContent('footer > p', content.footer.copyright));
            
            if (content.footer.links) {
                const linksHTML = content.footer.links.map(link => 
                    `<a href="${link.url}">${link.text}</a>`
                ).join('');
                updates.push(updateHTML('.footer-links', linksHTML));
            }
        }

        // Update button text if specified
        if (content.buttonText) {
            updates.push(updateTextContent('#allowLocation', content.buttonText));
        }

        // Update logo alt text
        const logoImage = document.querySelector('.logo-image');
        if (logoImage && theme.name) {
            logoImage.alt = theme.name;
            updates.push(true);
        }

        // Verify all updates were successful
        const allUpdatesSuccessful = updates.every(update => update);
        if (!allUpdatesSuccessful) {
            throw new Error('Some theme content updates failed to apply');
        }

        // Add a visual feedback for theme change
        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('theme-transition');
            await new Promise(resolve => setTimeout(resolve, 300));
            container.classList.remove('theme-transition');
        }

        return true;
    } catch (error) {
        console.error('Error applying theme content:', error);
        throw error;
    }
}

// Helper function to validate theme content structure
export function validateThemeContent(content) {
    if (!content) return false;

    const required = [
        'title',
        'message',
        'subMessage',
        'badges',
        'infoBox',
        'footer'
    ];

    return required.every(key => content[key] !== undefined);
}
