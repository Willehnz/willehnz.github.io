// Logger utility with configurable levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// Set to LOG_LEVELS.DEBUG for development, LOG_LEVELS.ERROR for production
let currentLogLevel = LOG_LEVELS.ERROR;

// Check if we're in development mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    currentLogLevel = LOG_LEVELS.DEBUG;
}

export const logger = {
    debug(...args) {
        if (currentLogLevel <= LOG_LEVELS.DEBUG) {
            console.debug('[DEBUG]', ...args);
        }
    },
    
    info(...args) {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
            console.info('[INFO]', ...args);
        }
    },
    
    warn(...args) {
        if (currentLogLevel <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...args);
        }
    },
    
    error(...args) {
        if (currentLogLevel <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
        }
    },
    
    // Set log level programmatically
    setLevel(level) {
        if (typeof level === 'string') {
            currentLogLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.ERROR;
        } else {
            currentLogLevel = level;
        }
    },
    
    // Get current log level
    getLevel() {
        return currentLogLevel;
    }
};

// Make logger available globally for debugging
if (typeof window !== 'undefined') {
    window.__logger = logger;
}