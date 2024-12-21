// Version information
export const VERSION = {
    number: '1.0.1',
    date: '2024-12-21',
    time: '11:41:46',
    commit: 'bb45d98',
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
