// extension/cmd.js

const console = require('./logging.js');
const session = require('./session.js');
const term = require('./terminal.js'); // Use node-pty from pty module
const fs = require('fs-extra'); // Use file system operations

function info(sessionId) {
    const sessionData = session.map.get(sessionId);
    const { timestamp, sessionIp, containerId, isDebug, isLoggedIn, isAdmin, screenWidth, screenHeight } = sessionData ?? '';
    return  `console.warn("` +
            `Session ID: ${sessionId}\\n` +
            `Session IP: ${sessionIp}\\n` +
            `Container ID: ${containerId}\\n` +
            `DebugStatus: ${!!(isDebug)}\\n` +
            `LoginStatus: ${!!(isLoggedIn)}\\n` +
            `AdminStatus: ${!!(isAdmin)}\\n` +
            `Screen: ${screenWidth} x ${screenHeight}\\n` +
            `Timestamp: ${timestamp}\\n` +
            `");`;
}

function alert(cmds){
    cmds.shift(); // trim mostleft "alert" entry
    let message = cmds.join(" "); // reconstruct message
    return `alert("${message}");`;
}

function login(socket, sessionId, pass) {
    if (session.isLoggedIn(sessionId)) return logout(socket, sessionId); // Logout if no pass & already logged in
    else if (pass) {
        if (session.comparePassword(sessionId, pass)) {
            console.debug(`Succeeded login attempt with password "${pass}" from Session ID ${sessionId}`);
            session.update(sessionId, { isLoggedIn: true });
            const validScript = fs.readFileSync('./stream/valid.js', 'utf8');
            socket.emit('eval', validScript);
            return `console.warn("Logged in");`; // Only notify if login is successful
        }
        else console.debug(`Failed login attempt with password "${pass}" from Session ID ${sessionId}`);
    }
}

function logout(socket, sessionId) {
    console.log(`Session ID ${sessionId} logged out`);

    // Update session map with loggedIn status
    session.update(sessionId, { isLoggedIn: false });
    const validScript = fs.readFileSync('./stream/valid.js', 'utf8');
    socket.emit('eval', validScript);
    return `console.warn("Logged out");`;
}

function theme(socket) { // Invert everything
    const themeScript = fs.readFileSync('./stream/theme.js', 'utf8');
    socket.emit('eval', themeScript);
}

function reset(socket, sessionId) { // Reset the client page
    session.update(sessionId, { containerId: null });
    const resetScript = fs.readFileSync('./stream/reset.js', 'utf8');
    socket.emit('eval', resetScript);
}

function debug(socket, sessionId) {
    let newDebugBool = !(session.isDebug(sessionId));
    session.update(sessionId, { isDebug: newDebugBool });
    return `console.warn("Debugging ${newDebugBool ? 'enabled' : 'disabled'}");`;
}

const os = require('os');
async function terminal(socket, sessionId, local = false) { // Create terminal for the client
    let containerId = session.read(sessionId, ['containerId']);

    let shell;
    if (local) {
        const isWin32 = !!(os.platform() === 'win32');
        shell = term.spawn(isWin32 ? 'cmd.exe' : 'bash', []);
        shell.write(isWin32 ? 'cmd\r' : 'clear && echo Hello!\n');
    } else if (!!(containerId)) {
        shell = term.spawn('docker', ['attach', containerId]);
        shell.write('clear && motd\n');
    }

    if (shell) {
        // Pipe the output of the pseudo-terminal to the socket
        shell.onData(data => {
            // Emit the data to the client
            socket.emit('terminalOutput', data);
        });

        // Handle input from the client and write it to the pseudo-terminal
        socket.on('terminalInput', input => {
            shell.write(input);
        });

        // Listen for the exit event
        shell.on('exit', () => {
            console.log('Terminal closed');
            reset(socket, sessionId);
        });
        // Return the JavaScript code to create the terminal on client-side
        const terminalScript = fs.readFileSync('./stream/terminal.js', 'utf8');
        socket.emit('eval', terminalScript);
        console.debug(`Attached Terminal to  - ${sessionId}`);
    } else socket.emit('eval', `console.warn("Couldn't connect to terminal");`);
}

module.exports = {
    info,
    debug,
    alert,
    theme,
    login,
    logout,
    terminal,
    reset,
};