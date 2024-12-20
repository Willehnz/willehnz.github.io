// Toast notification handler
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Error message handler
export function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Format browser information for display
export function formatBrowserInfo(data) {
    const browserName = data.browser?.name || 'Unknown';
    const browserVersion = data.browser?.version || '';
    return `<span class="browser-info">${browserName} ${browserVersion}</span>`;
}

// Create system info tooltip content
export function createSystemInfo(data) {
    return [
        `Memory: ${data.device?.memory}GB`,
        `Cores: ${data.device?.cores}`,
        `Language: ${data.device?.language}`,
        `Timezone: ${data.device?.timezone}`,
        `Connection: ${data.device?.connection?.type || 'Unknown'}`,
        `WebGL: ${data.browser?.webGL ? 'Yes' : 'No'}`
    ].join('\n');
}

// Create browser info tooltip content
export function createBrowserInfo(data) {
    return [
        `${data.browser?.name || 'Unknown'} ${data.browser?.version || ''}`,
        `${data.device?.platform || 'Unknown'}`,
        `Screen: ${data.screen?.width}x${data.screen?.height}`,
        `Touch: ${data.device?.touchPoints || 'Unknown'}`
    ].join('\n');
}

// Format user details for display
function formatUserDetails(data) {
    if (!data.firstName && !data.lastName && !data.phone) return 'No user details';
    
    const parts = [];
    if (data.firstName || data.lastName) {
        parts.push(`${data.firstName || ''} ${data.lastName || ''}`.trim());
    }
    if (data.phone) {
        parts.push(data.phone);
    }
    return parts.join(' • ');
}

// Create table row for location data
export function createLocationRow(data, locationKey, onRequestLocation, onDelete) {
    const row = document.createElement('tr');
    
    // User Details
    const userDetailsCell = row.insertCell();
    const userDetailsSpan = document.createElement('span');
    userDetailsSpan.className = 'truncate';
    userDetailsSpan.textContent = formatUserDetails(data);
    userDetailsSpan.setAttribute('title', formatUserDetails(data));
    userDetailsCell.appendChild(userDetailsSpan);
    
    // Timestamp
    const timestampCell = row.insertCell();
    timestampCell.textContent = new Date(data.timestamp).toLocaleString();
    
    // IP Address
    const ipCell = row.insertCell();
    ipCell.textContent = data.ip;
    
    // Location
    const locationCell = row.insertCell();
    const locationSpan = document.createElement('span');
    locationSpan.className = 'truncate';
    locationSpan.textContent = `${data.latitude}, ${data.longitude}`;
    locationSpan.setAttribute('title', `${data.latitude}, ${data.longitude}`);
    locationCell.appendChild(locationSpan);
    
    // Accuracy
    const accuracyCell = row.insertCell();
    accuracyCell.textContent = data.accuracy ? `±${Math.round(data.accuracy)}m` : 'Unknown';
    
    // Source
    const sourceCell = row.insertCell();
    sourceCell.textContent = data.locationSource || 'Unknown';
    
    // Browser & Device
    const browserCell = row.insertCell();
    const browserSpan = document.createElement('span');
    browserSpan.className = 'truncate';
    browserSpan.innerHTML = `${formatBrowserInfo(data)}<br>${data.device?.platform || 'Unknown'}`;
    browserSpan.setAttribute('title', createBrowserInfo(data));
    browserCell.appendChild(browserSpan);
    
    // System Info
    const systemCell = row.insertCell();
    const systemSpan = document.createElement('span');
    systemSpan.className = 'truncate';
    systemSpan.textContent = `${data.device?.memory}GB RAM, ${data.device?.cores} cores`;
    systemSpan.setAttribute('title', createSystemInfo(data));
    systemCell.appendChild(systemSpan);
    
    // Actions
    const actionsCell = row.insertCell();
    
    // Location request button
    const locationBtn = document.createElement('button');
    locationBtn.textContent = 'Request Location';
    locationBtn.className = 'location-btn';
    locationBtn.onclick = (e) => {
        e.stopPropagation();
        onRequestLocation(locationBtn);
    };
    actionsCell.appendChild(locationBtn);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        onDelete();
    };
    actionsCell.appendChild(deleteBtn);
    
    return row;
}

// Create marker popup content
export function createMarkerPopup(data) {
    const parts = [];
    
    // Add user details if available
    if (data.firstName || data.lastName || data.phone) {
        parts.push(`<strong>User:</strong> ${formatUserDetails(data)}`);
    }
    
    // Add timestamp
    parts.push(`<strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}`);
    
    // Add IP
    parts.push(`<strong>IP:</strong> ${data.ip}`);
    
    // Add coordinates and accuracy
    parts.push(`<strong>Coordinates:</strong> ${data.latitude}, ${data.longitude}`);
    if (data.accuracy) {
        parts.push(`<strong>Accuracy:</strong> ±${Math.round(data.accuracy)}m`);
    }
    
    // Add source
    parts.push(`<strong>Source:</strong> ${data.locationSource || 'Unknown'}`);
    
    return parts.join('<br>');
}
