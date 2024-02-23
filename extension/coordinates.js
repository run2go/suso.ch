// extension/coordinates.js

const cmd = require('./cmd.js');
const session = require('./session.js');
const fs = require('fs-extra');

// Handle various screen coordinates, trigger keyboard
function handle(socket, sessionId, coords) {
    const [posX, posY, width, height] = coords; // Deconstruct coords array
    const {screenWidth, screenHeight, containerName} = session.read(sessionId, ['screenWidth', 'screenHeight', 'containerName']); // Extract stored screen size
    if (width != screenWidth || height != screenHeight) { // Update screen size if changed
        session.update(sessionId, {screenWidth: width, screenHeight: height}); 
    }

    if (containerName) {
        // Handle interactions near the center
        const widthCenter = screenWidth / 2;
        const heightCenter = screenHeight / 2;
        if ((posX < widthCenter * 1.2) && (posX > widthCenter * 0.8) && (posY < heightCenter * 1.2) && (posY > heightCenter * 0.8) ) {
            const keyboardScript = fs.readFileSync('./stream/keyboard.js', 'utf8');
            socket.emit('eval', keyboardScript);
        }

        // Handle exit/close interactions
        const widthTopRight = screenWidth;
        const heightTopRight = screenHeight;
        if ((posX > widthTopRight * 0.9) && (posY < heightTopRight * 0.1) ) {
            cmd.reset(socket, sessionId);
        }
    }
}

module.exports = {
    handle,
};
