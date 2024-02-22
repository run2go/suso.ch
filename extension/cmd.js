// extension/cmd.js

const os = require('os');
const pty = require('node-pty');
const fs = require('fs-extra');
const console = require('./logging.js');
const session = require('./session.js');
const dock = require('./dockerode.js');

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

function debug(sessionId) {
    const newDebugBool = !session.isDebug(sessionId);
    session.update(sessionId, { isDebug: newDebugBool });
    return `console.warn("Debugging ${newDebugBool ? 'enabled' : 'disabled'}");`;
}

async function terminal(socket, sessionId, local = false) { // Create terminal for the client
    let {containerId, screenWidth, screenHeight} = session.read(sessionId, ['containerId', 'screenWidth', 'screenHeight']);

    // Use the stored screen size information to calculate cols and rows
    const cols = Math.floor(screenWidth / 8); // Character width of 8px
    const rows = Math.floor(screenHeight / 16); // Character height of 16px

    process.env['TERM'] = 'xterm-256color';
    let shell;
    if (local) { // Create local terminal
        const isWin32 = !!(os.platform() === 'win32');
        shell = pty.spawn(isWin32 ? 'cmd.exe' : 'bash', [], {
            name: 'xterm-color',
            cols: cols,
            rows: rows,
            cwd: process.env.HOME,
            env: process.env
        });
        shell.write(isWin32 ? 'echo Hello!\r\n' : 'clear && echo Hello!\n');
    }
    else if (!containerId) { // Create new container
        containerId = await dock.containerCreate();
    }
    else if (containerId) { // Attach container console
        shell = pty.spawn('docker', ['attach', `${containerId}`], {
            name: 'xterm-color',
            cols: cols,
            rows: rows,
            cwd: process.env.HOME,
            env: process.env
        });
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
            console.info(`Terminal "${containerId || 'local'}" closed from ${sessionId}`);
            shell.kill();
            reset(socket, sessionId);
        });
        // Return the JavaScript code to create the terminal on client-side
        const terminalScript = fs.readFileSync('./stream/terminal.js', 'utf8');
        socket.emit('eval', terminalScript);
        console.info(`Attached Terminal "${containerId || 'local'}" to ${sessionId}`);
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