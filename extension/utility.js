// extension/utility.js

const fs = require('fs-extra'); // Use file system operations
const console = require('./logging.js');

// Copy socket.io and xterm.js files
async function copyFiles(path, directory) {
    const filePairs = [
        [
            path.join(directory, 'node_modules/socket.io/client-dist/socket.io.min.js'),
            path.join(directory, 'web/inc/socket.io/socket.io.min.js')
        ],
        [
            path.join(directory, 'node_modules/xterm/css/xterm.css'),
            path.join(directory, 'web/inc/xterm/xterm.css')
        ],
        [
            path.join(directory, 'node_modules/xterm/lib/xterm.js'),
            path.join(directory, 'web/inc/xterm/xterm.js')
        ],
        [
            path.join(directory, 'node_modules/xterm-addon-fit/lib/xterm-addon-fit.js'),
            path.join(directory, 'web/inc/xterm/xterm-addon-fit.js')
        ]
    ];
    try {
        let handledFiles = 0;
        for (const [src, dest] of filePairs) {
            const srcStat = await fs.stat(src);
            const destStat = await fs.stat(dest);

            // Check if source file is newer than destination file
            if (srcStat.mtime > destStat.mtime) {
                await fs.ensureDir(path.dirname(dest));
                await fs.copyFile(src, dest);
                console.debug(`Copied "${src}" to "${dest}"`);
                handledFiles++;
            } else {
                console.debug(`File "${dest}" is up to date.`);
            }
        }
        if (handledFiles > 0) console.info(`Web files handled: ${filePairs.length}`);
    } catch (error) {
        console.error('Failed to copy files:', error);
    }
}

module.exports = {
    copyFiles,
};