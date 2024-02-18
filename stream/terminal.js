// Terminal Data

// Transition logo, fade out
const logo = document.querySelector('#logo');
logo.style.transition = 'transform 0.5s, width 0.5s, height 0.5s, opacity 0.5s';
logo.style.width = '0';
logo.style.height = '0';
logo.style.opacity = '0';

// Load xterm files dynamically
const xtermCss = document.createElement('link');
xtermCss.rel = 'stylesheet';
xtermCss.type = 'text/css';
xtermCss.href = './inc/xterm/xterm.css';
document.head.appendChild(xtermCss);

// Create a parent element for the terminal
const terminalContainer = document.createElement('div');
terminalContainer.id = 'terminal-container';
document.body.appendChild(terminalContainer);

// Apply CSS to make the terminal container span the entire screen
terminalContainer.style.position = 'absolute';
terminalContainer.style.top = '0';
terminalContainer.style.left = '0';
terminalContainer.style.width = '100vw';
terminalContainer.style.height = '100vh';

const xtermScript = document.createElement('script');
xtermScript.src = './inc/xterm/xterm.js';
xtermScript.async = true;
document.head.appendChild(xtermScript);

const xtermScriptAddon = document.createElement('script');
xtermScriptAddon.src = './inc/xterm/xterm-addon-fit.js';
xtermScriptAddon.async = true;
document.head.appendChild(xtermScriptAddon);

// Function to initialize terminal once xterm.js is loaded
function initializeTerminal() {

    // Initialize xterm.js
    const term = new Terminal();
    term.open(terminalContainer);

    // Apply the fit addon to automatically fit the terminal size to its container
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();

    // Listen for terminal output from the server
    socket.on('terminalOutput', data => {
        term.write(data);
    });

    // Listen for user input and send it to the server
    term.onData(data => {
        socket.emit('terminalInput', data);
    });

    term.focus();
}

// Wait 100ms for xterm files to load
setTimeout(() => { initializeTerminal(); }, 300);