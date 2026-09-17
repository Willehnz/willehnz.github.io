import { getVersionDisplay } from "./src/core/version.js";
import { authenticateAdmin, signOutAdmin, onAuthStateChanged, initSession } from "./src/core/auth.js";
import { logger } from "./src/utils/logger.js";

const adminModule = import("./src/features/admin/admin-new.js");

const firebaseReady = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Firebase timeout")), 15000);
    const check = () => {
        if (window.firebaseLoaded && window.database) { clearTimeout(timeout); resolve(); }
        else setTimeout(check, 100);
    };
    check();
});

const loginScreen = document.getElementById("loginScreen");
const mainContent = document.getElementById("mainContent");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const versionDisplay = document.getElementById("versionDisplay");
const themeSelect = document.getElementById("themeSelect");

function showLogin() { loginScreen.style.display = "flex"; mainContent.style.display = "none"; }
function showMain() { loginScreen.style.display = "none"; mainContent.style.display = "flex"; }
function showLoginError(msg) { if (loginError) { loginError.textContent = msg; loginError.style.display = "block"; } }
function hideLoginError() { if (loginError) loginError.style.display = "none"; }

async function initAdmin() {
    try {
        const { initializeAdmin } = await adminModule;
        await initializeAdmin();
        if (versionDisplay) versionDisplay.textContent = getVersionDisplay();
        loadTheme();
        if (themeSelect) themeSelect.addEventListener("change", saveTheme);
        initSession(handleSessionTimeout);
        logger.info("Admin panel ready");
    } catch (e) { logger.error("Admin init error:", e); }
}

async function handleLogin(e) {
    e.preventDefault();
    hideLoginError();
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    if (!email || !password) { showLoginError("Please enter email and password"); return; }
    
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    
    try {
        await firebaseReady;
        await authenticateAdmin(email, password);
        showMain();
        await initAdmin();
    } catch (e) {
        logger.error("Login failed:", e);
        showLoginError(e.message || "Login failed");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
}

async function handleLogout() {
    try { await signOutAdmin(); } catch (e) { logger.error("Logout error:", e); }
    showLogin();
}

function handleSessionTimeout() {
    alert("Session expired. Please log in again.");
    handleLogout();
}

async function loadTheme() {
    if (!themeSelect || !window.database) return;
    try {
        const snapshot = await window.database.ref("activeTheme").once("value");
        themeSelect.value = snapshot.val() || "westpac";
    } catch (e) { logger.error("Failed to load theme:", e); }
}

async function saveTheme() {
    if (!themeSelect || !window.database) return;
    try {
        await window.database.ref("activeTheme").set(themeSelect.value);
        const toast = document.getElementById("toast");
        if (toast) { toast.textContent = "Theme updated"; toast.className = "toast success show"; setTimeout(() => toast.classList.remove("show"), 2000); }
    } catch (e) { logger.error("Failed to save theme:", e); }
}

function setupThemePreview() {
    const previewBtn = document.getElementById("previewThemeBtn");
    const closeBtn = document.getElementById("closePreviewBtn");
    const modal = document.getElementById("themePreviewModal");
    const frame = document.getElementById("themePreviewFrame");
    if (!previewBtn || !modal) return;
    
    previewBtn.addEventListener("click", () => {
        frame.src = `index.html?preview=${themeSelect?.value || "westpac"}`;
        modal.classList.add("show");
    });
    closeBtn?.addEventListener("click", () => { modal.classList.remove("show"); frame.src = ""; });
    modal.addEventListener("click", (e) => { if (e.target === modal) { modal.classList.remove("show"); frame.src = ""; } });
}

document.addEventListener("DOMContentLoaded", () => {
    logger.debug("DOM loaded");
    loginForm?.addEventListener("submit", handleLogin);
    logoutButton?.addEventListener("click", handleLogout);
    setupThemePreview();
    
    onAuthStateChanged(async (user) => {
        if (user) {
            logger.debug("User authenticated");
            try { await firebaseReady; showMain(); await initAdmin(); }
            catch (e) { logger.error("Session restore failed:", e); showLogin(); }
        } else { showLogin(); }
    });
});
