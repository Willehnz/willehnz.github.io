// Toast notification
export function showToast(message, type = "success", autoHide = true) {
    const toast = document.getElementById("toast");
    if (!toast) return null;

    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    if (autoHide) {
        toast.hideTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
    return toast;
}

// Error banner
export function showError(message) {
    const errorBanner = document.getElementById("errorMessage");
    if (errorBanner) {
        errorBanner.textContent = message;
        setTimeout(() => { errorBanner.textContent = ""; }, 10000);
    }
}

// Create marker popup content
export function createMarkerPopup(data) {
    const parts = [];
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
    if (name) parts.push(`<strong>User:</strong> ${escapeHtml(name)}`);
    if (data.phone) parts.push(`<strong>Phone:</strong> ${escapeHtml(data.phone)}`);
    if (data.timestamp) parts.push(`<strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}`);
    parts.push(`<strong>IP:</strong> ${escapeHtml(data.ip || "Unknown")}`);
    if (data.latitude && data.longitude) {
        parts.push(`<strong>Coords:</strong> ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
    }
    if (data.accuracy) parts.push(`<strong>Accuracy:</strong> +/-${Math.round(data.accuracy)}m`);
    if (data.locationSource) parts.push(`<strong>Source:</strong> ${escapeHtml(data.locationSource)}`);
    return parts.join("<br>");
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
