// extension/terminal.js

const pty = require('node-pty');
const session = require('./session.js');
// 
async function spawn(sessionId, process, commands) {
    let [screenWidth, screenHeight] = session.read(sessionId, ['screenWidth', 'screenHeight']);

    // Use the stored screen size information to calculate cols and rows
    const cols = Math.floor(screenWidth / 8); // Character width of 8px
    const rows = Math.floor(screenHeight / 16); // Character height of 16px

    //env['TERM'] = 'xterm-256color';
    let terminal = pty.spawn(process, commands, {
        name: 'xterm-color',
        cols: cols,
        rows: rows,
        cwd: process.env.HOME,
        env: process.env
    });
    return terminal;
}

module.exports = {
    spawn,
};
