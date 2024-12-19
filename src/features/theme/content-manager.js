// Helper function to safely update text content
function updateTextContent(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = text;
    }
}

// Helper function to safely update HTML content
function updateHTML(selector, html) {
    const element = document.querySelector(selector);
    if (element) {
        element.innerHTML = html;
    }
}

// Apply theme content to the page
export function applyContent(theme) {
    const content = theme.content;
    if (!content) return;

    // Update main content
    updateTextContent('h1', content.title);
    updateTextContent('.message', content.message);
    updateTextContent('.sub-message', content.subMessage);

    // Update security badges
    if (content.badges) {
        const badgesHTML = content.badges.map(badge => `
            <div class="badge">
                <span class="icon">${badge.icon}</span>
                <span class="text">${badge.text}</span>
            </div>
        `).join('');
        updateHTML('.security-badges', badgesHTML);
    }

    // Update info box
    if (content.infoBox) {
        const infoBoxHTML = `
            <p>${content.infoBox.title}</p>
            <ul>
                ${content.infoBox.points.map(point => 
                    `<li>${point}</li>`
                ).join('')}
            </ul>
        `;
        updateHTML('.info-box', infoBoxHTML);
    }

    // Update footer
    if (content.footer) {
        updateTextContent('footer > p', content.footer.copyright);
        
        if (content.footer.links) {
            const linksHTML = content.footer.links.map(link => 
                `<a href="${link.url}">${link.text}</a>`
            ).join('');
            updateHTML('.footer-links', linksHTML);
        }
    }

    // Update button text if specified
    if (content.buttonText) {
        updateTextContent('#allowLocation', content.buttonText);
    }

    // Update logo alt text
    const logoImage = document.querySelector('.logo-image');
    if (logoImage && theme.name) {
        logoImage.alt = theme.name;
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
