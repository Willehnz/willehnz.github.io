// Browser detection helper functions
export function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("SamsungBrowser")) return "Samsung Browser";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
    if (ua.includes("Trident")) return "Internet Explorer";
    if (ua.includes("Edge")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    return "Unknown";
}

export function getBrowserVersion() {
    const ua = navigator.userAgent;
    let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        let tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return tem[1] || '';
    }
    if (M[1] === 'Chrome') {
        const tem = ua.match(/\bOPR|Edge\/(\d+)/);
        if (tem !== null) return tem[1];
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    let tem = ua.match(/version\/(\d+)/i);
    if (tem !== null) M.splice(1, 1, tem[1]);
    return M[1];
}

export function getDeviceInfo() {
    return {
        screen: {
            width: window.screen.width,
            height: window.screen.height,
            colorDepth: window.screen.colorDepth,
            pixelRatio: window.devicePixelRatio
        },
        device: {
            memory: navigator.deviceMemory || 'Unknown',
            cores: navigator.hardwareConcurrency || 'Unknown',
            platform: navigator.platform,
            vendor: navigator.vendor,
            language: navigator.language,
            languages: navigator.languages,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            touchPoints: navigator.maxTouchPoints,
            connection: navigator.connection ? {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            } : 'Unknown'
        },
        browser: {
            name: getBrowserName(),
            version: getBrowserVersion(),
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack || 'unspecified',
            plugins: Array.from(navigator.plugins).map(p => p.name),
            webdriver: navigator.webdriver,
            pdfViewerEnabled: navigator.pdfViewerEnabled,
            deviceOrientation: window.DeviceOrientationEvent ? 'Supported' : 'Not supported',
            webGL: !!document.createElement('canvas').getContext('webgl')
        }
    };
}
