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
export function createFormFields() {
    const formFields = document.createElement('div');
    formFields.className = 'form-fields';

    const fields = [
        { id: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter your first name' },
        { id: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter your last name' },
        { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '021234567 or +64212345678' }
    ];

    fields.forEach(field => {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-field';

        const label = document.createElement('label');
        label.htmlFor = field.id;
        label.textContent = field.label;

        const input = document.createElement('input');
        input.type = field.type;
        input.id = field.id;
        input.placeholder = field.placeholder;
        input.required = true;

        const errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.id = `${field.id}-error`;

        // Add validation on input
        input.addEventListener('input', () => validateField(field.id));

        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);
        fieldContainer.appendChild(errorMessage);
        formFields.appendChild(fieldContainer);
    });

    return formFields;
}

// Validate a single field
export function validateField(fieldId) {
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

// Validate all fields
export function validateForm() {
    const fields = ['firstName', 'lastName', 'phone'];
    return fields.every(fieldId => validateField(fieldId));
}

// Get form data
export function getFormData() {
    if (!validateForm()) {
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
        verifyButton.disabled = !validateForm();
    }
}

// Initialize form validation
export function initializeFormValidation() {
    const fields = ['firstName', 'lastName', 'phone'];
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('input', () => {
                validateField(fieldId);
                updateVerifyButtonState();
            });
        }
    });
    
    // Initial button state
    updateVerifyButtonState();
}
