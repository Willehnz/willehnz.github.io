// Form validation rules
const validationRules = {
    firstName: {
        pattern: /^[A-Za-z\s-']{2,50}$/,
        message: "First name must be 2-50 characters long and contain only letters, spaces, hyphens, and apostrophes"
    },
    lastName: {
        pattern: /^[A-Za-z\s-']{2,50}$/,
        message: "Last name must be 2-50 characters long and contain only letters, spaces, hyphens, and apostrophes"
    },
    phone: {
        pattern: /^(?:\+64|0)[2-9]\d{7,9}$/,
        message: "Please enter a valid NZ phone number (e.g., 021234567 or +64212345678)"
    }
};

// Create form fields with validation
export function createFormFields(theme) {
    const formFields = document.createElement('div');
    formFields.className = 'form-fields';

    const fields = ['firstName', 'lastName', 'phone'];
    const defaultLabels = {
        firstName: "First Name",
        lastName: "Last Name",
        phone: "Phone Number"
    };
    const defaultPlaceholders = {
        firstName: "Enter your first name",
        lastName: "Enter your last name",
        phone: "021234567 or +64212345678"
    };

    fields.forEach(fieldId => {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-field';

        // Get theme-specific or default label/placeholder
        const fieldConfig = theme?.content?.formFields?.[fieldId] || {};
        const label = document.createElement('label');
        label.htmlFor = fieldId;
        label.textContent = fieldConfig.label || defaultLabels[fieldId];

        const input = document.createElement('input');
        input.type = fieldId === 'phone' ? 'tel' : 'text';
        input.id = fieldId;
        input.placeholder = fieldConfig.placeholder || defaultPlaceholders[fieldId];
        input.required = true;

        const errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.id = `${fieldId}-error`;

        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);
        fieldContainer.appendChild(errorMessage);
        formFields.appendChild(fieldContainer);
    });

    return formFields;
}

// Validate a single field without showing error
function validateFieldSilent(fieldId) {
    const input = document.getElementById(fieldId);
    const rule = validationRules[fieldId];

    if (!input.value) {
        return false;
    }

    return rule.pattern.test(input.value);
}

// Validate a single field and show error
export function validateFieldWithError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    const rule = validationRules[fieldId];

    if (!input.value) {
        errorElement.textContent = `${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)} is required`;
        return false;
    }

    if (!rule.pattern.test(input.value)) {
        errorElement.textContent = rule.message;
        return false;
    }

    errorElement.textContent = '';
    return true;
}

// Clear all error messages
export function clearErrors() {
    const fields = ['firstName', 'lastName', 'phone'];
    fields.forEach(fieldId => {
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
    });
}

// Validate all fields silently (for button state)
function validateFormSilent() {
    const fields = ['firstName', 'lastName', 'phone'];
    return fields.every(fieldId => validateFieldSilent(fieldId));
}

// Validate all fields with errors
export function validateFormWithErrors() {
    const fields = ['firstName', 'lastName', 'phone'];
    return fields.every(fieldId => validateFieldWithError(fieldId));
}

// Get form data
export function getFormData() {
    if (!validateFormWithErrors()) {
        return null;
    }

    return {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        phone: document.getElementById('phone').value
    };
}

// Format phone number for display
export function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format based on length and prefix
    if (digits.startsWith('64')) {
        return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    } else if (digits.startsWith('0')) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    }
    
    return phone;
}

// Enable/disable verify button based on form validation
export function updateVerifyButtonState() {
    const verifyButton = document.getElementById('allowLocation');
    if (verifyButton) {
        verifyButton.disabled = !validateFormSilent();
    }
}

// Initialize form validation
export function initializeFormValidation() {
    const fields = ['firstName', 'lastName', 'phone'];
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('input', () => {
                clearErrors(); // Clear errors on input
                updateVerifyButtonState();
            });
        }
    });
    
    // Initial button state
    updateVerifyButtonState();
}

// Update form fields for theme
export function updateFormForTheme(theme) {
    if (!theme?.content?.formFields) return;

    Object.entries(theme.content.formFields).forEach(([fieldId, config]) => {
        const input = document.getElementById(fieldId);
        const label = document.querySelector(`label[for="${fieldId}"]`);
        
        if (input && config.placeholder) {
            input.placeholder = config.placeholder;
        }
        if (label && config.label) {
            label.textContent = config.label;
        }
    });
}
