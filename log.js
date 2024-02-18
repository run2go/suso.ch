// log.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.cfg' });
const logFilePath = process.env.LOGFILE_PATH;
const loggingEnabled = (process.env.LOGGING_ENABLED === "true");
let debugEnabled = (process.env.DEBUG_ENABLED === "true");

// Use the file system library to write to the logfile
const fs = require('fs');

// Check the current debug bool
function checkDebug() {
	return debugEnabled;
}

// Toggle Debug mode, return bool
function toggleDebug() {
	return !!(debugEnabled = !debugEnabled);
}

// Get the current date and format it into "year-month-day hour:minute:second"
function getTimestamp() {
	const currentDate = new Date();
	const year = currentDate.getFullYear();
	const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Adding 1 to month since it's zero-based (January = 0, December = 11)
	const day = String(currentDate.getDate()).padStart(2, '0');
	const hour = String(currentDate.getHours()).padStart(2, '0');
	const minute = String(currentDate.getMinutes()).padStart(2, '0');
	const second = String(currentDate.getSeconds()).padStart(2, '0');
	const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
	return formattedDate;
}

// Save the original console functions
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

// Override the default console logging functions
function log(...args) {
	const formattedDate = getTimestamp();
    const logMessage = `[${formattedDate}] ${args[0]} ${args.slice(1).join(' ')}`;

    originalConsoleLog(logMessage);
    if (loggingEnabled) { fs.appendFileSync(logFilePath, logMessage + '\n'); }
}
function warn(...args) {
	const formattedDate = getTimestamp();
    const warnMessage = `[${formattedDate}] [WARN] ${args[0]} ${args.slice(1).join(' ')}`;

    originalConsoleWarn(warnMessage);
    if (loggingEnabled) { fs.appendFileSync(logFilePath, warnMessage + '\n'); }
}
function error(...args) {
	const formattedDate = getTimestamp();
    const errorMessage = `[${formattedDate}] [ERROR] ${args[0]} ${args.slice(1).join(' ')}`;

    originalConsoleError(errorMessage);
    if (loggingEnabled) { fs.appendFileSync(logFilePath, errorMessage + '\n'); }
}
function debug(...args) {
	const formattedDate = getTimestamp();
    const debugMessage = `[${formattedDate}] [DEBUG] ${args[0]} ${args.slice(1).join(' ')}`;

	if (debugEnabled) {
		originalConsoleDebug(debugMessage);
		if (loggingEnabled) { fs.appendFileSync(logFilePath, debugMessage + '\n'); }
	}
}

module.exports = {
	toggleDebug,
	checkDebug,
	getTimestamp,
	log,
	warn,
	error,
	debug,
};