// extension/session.js


require('dotenv').config({ path: './config/config.cfg' }); // Access parameters in the config.ini file
const sessionTimeout = process.env.SESSION_TIMEOUT;

let map = new Map(); // Map Session IDs to track associated sockets & data
const moment = require('moment'); // Use 'moment' library for timestamp handling
const uuid = require('uuid');
const dock = require('./dockerode.js');
const console = require('./logging.js');
const fs = require('fs-extra'); // Use file system operations
const authData = JSON.parse(fs.readFileSync('./config/auth.json', 'utf8')); // Load the auth.json file
const authList = authData.auth;
const adminList = authData.admin;

// Function to get access map variables
function read(sessionId, data = false) {
    const sessionData = map.get(sessionId);
    if (!data) return sessionData; // Return everything
    else return sessionData ? sessionData[data] : undefined; // Return requested entries
}

// Function to update the map while making sure to maintain existing values.
function update(sessionId, newData) {
    const existingData = map.get(sessionId);
    const updatedData = { ...existingData, ...newData };
    map.set(sessionId, updatedData);
}

// Function to generate UUIDs as session IDs
function create() {
    return uuid.v4();
}

// Function to validate session UUIDs
function isValid(sessionId) {
    return !!(map.has(sessionId));
}

// Function to check if a session is logged in
function isLoggedIn(sessionId) {
    return !!(map.get(sessionId).loggedIn);
}

// Functio to check if the active session is an admin session
function isAdmin(sessionId) {
    return !!(map.get(sessionId).isAdmin);
}

// Function to compare password with hashed passwords in authList
const bcrypt = require('bcrypt');
function comparePassword(sessionId, pass) {
    let isAdmin = adminList.some((hash) => bcrypt.compareSync(pass, hash));
    let isValid = authList.some((hash) => bcrypt.compareSync(pass, hash));
    if (isAdmin)  update(sessionId, { isAdmin: true });
    return isAdmin || isValid;
}

// Helper function to keep track of map values
function printMap() {
    console.debug(`Session Map Data, total entries '${map.size}':`);
    map.forEach((value, key) => {
        const sessionData = map.get(key);
        const { timestamp, containerId, loggedIn, screenWidth, screenHeight } = sessionData ?? '';
        console.debug(`Session ID: ${key}` +
            `\nTimestamp: ${timestamp}` +
            `\nContainer ID: ${containerId}` +
            `\nLoginStatus: ${loggedIn}` +
            `\nScreen: ${screenWidth} x ${screenHeight}`);
    });
}

// Function to remove expired sessions & cleanup containers
function removeExpired() {
    const now = moment();
    for (const [sessionId, sessionData] of map.entries()) {
        if (sessionData.timestamp) {
            const diff = now.diff(sessionData.timestamp, 'minutes');
            if (diff > sessionTimeout) {
                // Check if sessionData contains containerId information
                dock.containerRemove(sessionData.containerId);
                map.delete(sessionId); // Delete the timed out session entry					
            }
        }
    }
}

module.exports = {
    map,
    read,
    update,
    create,
    isValid,
    isLoggedIn,
    isAdmin,
    comparePassword,
    printMap,
    removeExpired,
};