// extension/cmd.js

const os = require('os');
const pty = require('node-pty');
const fs = require('fs-extra');
const console = require('./logging.js');
const session = require('./session.js');
const dock = require('./dockerode.js');

function info(sessionId) {
    const { sessionIp, containerId, containerName, isDebug, isLoggedIn, isAdmin, screenWidth, screenHeight, timestamp } = session.read(sessionId, ['sessionIp', 'containerId', 'containerName', 'isDebug', 'isLoggedIn', 'isAdmin', 'screenWidth', 'screenHeight', 'timestamp']);
    return  `console.warn("` +
            `Session ID: ${sessionId}\\n` +
            `Session IP: ${sessionIp}\\n` +
            `Container ID: ${containerId}\\n` +
            `Container Name: ${containerName}\\n` +
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

function reset(socket) { // Reset the client page
    const resetScript = fs.readFileSync('./stream/reset.js', 'utf8');
    socket.emit('eval', resetScript);
}

function debug(sessionId) {
    const newDebugBool = !session.isDebug(sessionId);
    session.update(sessionId, { isDebug: newDebugBool });
    return `console.warn("Debugging ${newDebugBool ? 'enabled' : 'disabled'}");`;
}

async function terminal(socket, sessionId, local = false) { // Create terminal for the client
    // Retrieve containerId, containerName and screen size of active sessionId
    let {containerId, containerName, screenWidth, screenHeight} = session.read(sessionId, ['containerId', 'containerName', 'screenWidth', 'screenHeight']);

    // Use the stored screen size information to calculate cols and rows
    const cols = Math.floor(screenWidth / 8); // Character width of 8px
    const rows = Math.floor(screenHeight / 16); // Character height of 16px
    
    process.env['TERM'] = 'xterm-256color'; // Support 256-bit color depth
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
        shell.write(isWin32 ? 'echo Hello!\r\n' : 'clear && cat /etc/motd\n');
    }
    if (!local && !containerId) { // Spawn new container if containerId is missing
        containerId = await dock.containerCreate(); // Create new container
        containerName = await dock.containerGetName(containerId); // Retrieve generated container name
        const isContainerRunning = await dock.containerRunning(containerId);
        if (isContainerRunning) session.update(sessionId, { containerId: containerId, containerName: containerName });
        else throw `Container didn't start properly`;
    }

    if (!local && containerName) { // Attach container console
        shell = pty.spawn('docker', ['attach', `${containerName}`], {
            name: 'xterm-color',
            cols: cols,
            rows: rows,
            cwd: process.env.HOME,
            env: process.env
        });
    } else socket.emit('eval', `console.warn("Yikes");`);

    if (shell) {
        // Pipe the output of the pseudo-terminal to the socket reaching the client
        shell.onData(data => {
            socket.emit('terminalOutput', data);
        });

        // Handle input from the client and write it to the pseudo-terminal
        socket.on('terminalInput', input => {
            shell.write(input);
        });

        // Listen for the exit event
        shell.on('exit', () => {
            console.info(`Terminal "${containerName || 'local'}" closed from ${sessionId}`);
            shell.kill();
            reset(socket, sessionId);
        });
        
        // Return the JavaScript code to create the terminal on client-side
        const terminalScript = fs.readFileSync('./stream/terminal.js', 'utf8');
        socket.emit('eval', terminalScript);
        console.info(`Terminal "${containerName || 'local'}" attached to ${sessionId}`);
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