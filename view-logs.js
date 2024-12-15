// Password hash (default password is "admin123")
const PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';  

function sha256(message) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);                    
    // hash the message
    return crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
        // convert ArrayBuffer to Array
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        // convert bytes to hex string                  
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    });
}

async function checkPassword() {
    const password = document.getElementById('password').value;
    const hash = await sha256(password);
    
    if (hash === PASSWORD_HASH) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        // Initialize map and load data after successful login
        initMap();
        refreshData();
    } else {
        alert('Incorrect password');
    }
}

// Prevent form submission and handle enter key
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await checkPassword();
});
