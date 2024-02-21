// extension/coordinates.js

const cmd = require('./cmd.js');
const session = require('./session.js');
const fs = require('fs-extra');

// Handle various screen coordinates, trigger keyboard
function handle(socket, sessionId, coords) {
    let [posX, posY] = coords;
    let [screenWidth, screenHeight] = session.read(sessionId, ['screenWidth', 'screenHeight']);

    console.log(`aa + ${screenWidth}`);
    
    let widthCenter = screenWidth / 2;
    let heightCenter = screenHeight / 2;
    if ( (posX < widthCenter * 1.2) && (posX > widthCenter * 0.8) && (posY < heightCenter * 1.2) && (posY > heightCenter * 0.8) ) {
        const keyboardScript = fs.readFileSync('./stream/keyboard.js', 'utf8');
        socket.emit('eval', keyboardScript);
    }
    let widthTopRight = screenWidth;
    let heightTopRight = screenHeight;
    if ( (posX > widthTopRight * 0.9) && (posY < heightTopRight * 0.1) ) {
        cmd.reset(socket, sessionId);
    }
}

module.exports = {
    handle,
};