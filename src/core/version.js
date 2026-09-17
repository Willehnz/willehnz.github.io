// Version information
export const VERSION = {
    number: '1.0.52',
    date: '2026-09-17',
    time: '19:50:30',
    commit: '34e1ae3',
    toString() {
        return `v${this.number} (${this.date})`;
    }
};

// Function to get version display text
export function getVersionDisplay() {
    return VERSION.toString();
}

// Function to update version (can be expanded later for automated updates)
export function updateVersion(newVersion) {
    VERSION.number = newVersion.number || VERSION.number;
    VERSION.date = newVersion.date || VERSION.date;
    VERSION.time = newVersion.time || VERSION.time;
    VERSION.commit = newVersion.commit || VERSION.commit;
}
