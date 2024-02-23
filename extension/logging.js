const fs = require('fs');
require('dotenv').config({ path: 'config.cfg' });

const logFilePath = process.env.LOGFILE_PATH;
const loggingEnabled = process.env.LOGGING_ENABLED === 'true';
let debugEnabled = process.env.DEBUG_ENABLED === 'true';

function checkDebug() {
    return debugEnabled;
}

function toggleDebug() {
    return debugEnabled = !debugEnabled;
}

function getTimestamp() {
    return new Date().toISOString(); // Using ISO format for simplicity
}

const { log, info, warn, error, debug } = console;

function logWithTimestamp(level, ...args) {
    const formattedDate = getTimestamp();
    let logMessage = `[${formattedDate}]`;
    if (level !== null) logMessage += ` [${level.toUpperCase()}]`;
    logMessage += ` ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`;

    console[level || 'log'](logMessage);

    if (loggingEnabled) { fs.appendFileSync(logFilePath, logMessage + '\n'); }
}

module.exports = {
    toggleDebug,
    checkDebug,
    getTimestamp,
	log: (...args) => logWithTimestamp(null, ...args),
	info: (...args) => logWithTimestamp('info', ...args),
	warn: (...args) => logWithTimestamp('warn', ...args),
	error: (...args) => logWithTimestamp('error', ...args),
	debug: (...args) => { if (debugEnabled) logWithTimestamp('debug', ...args); },
};
