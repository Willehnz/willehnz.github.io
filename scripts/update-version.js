#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to version.js
const versionFilePath = path.join(__dirname, '..', 'src', 'core', 'version.js');

// Get current date and time
const now = new Date();
const date = now.toISOString().split('T')[0];
const time = now.toTimeString().split(' ')[0];

// Get latest commit hash
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

// Read current version file
let versionContent = fs.readFileSync(versionFilePath, 'utf8');

// Parse current version number
const versionMatch = versionContent.match(/number: ['"](\d+\.\d+\.\d+)['"]/);
if (!versionMatch) {
    console.error('Could not find version number in version.js');
    process.exit(1);
}

// Increment patch version
const currentVersion = versionMatch[1];
const [major, minor, patch] = currentVersion.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

// Update version.js content
const newContent = versionContent
    .replace(/number: ['"][\d.]+['"]/, `number: '${newVersion}'`)
    .replace(/date: ['"][\d-]+['"]/, `date: '${date}'`)
    .replace(/time: ['"][\d:]+['"]/, `time: '${time}'`)
    .replace(/commit: ['"][^'"]+['"]/, `commit: '${commitHash}'`);

// Write updated content back to file
fs.writeFileSync(versionFilePath, newContent);

// Stage the updated version file
try {
    execSync('git add src/core/version.js');
    console.log(`Version updated to ${newVersion} (${date} ${time}) - ${commitHash}`);
} catch (error) {
    console.error('Failed to stage version.js:', error);
    process.exit(1);
}
