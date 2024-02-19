// server.js

require('dotenv').config({ path: './config/config.cfg' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverAddress = process.env.SERVER_ADDRESS;
const helpURL = process.env.HELP_URL;
const sessionTimeout = process.env.SESSION_TIMEOUT;

const helpText = `Visit ${helpURL} for more information
RESTART   Restart the server instance.
STOP      Shutdown the server instance.
DEBUG     Toggle verbose mode used for debugging.
HELP      Print this message.`;

const fs = require('fs-extra'); // Use file system operations
const path = require('path'); // Allows working with file & directory paths
const console = require('./log.js'); // Use the logging functionality inside the log.js file

let program; // Declare program variable
let sockets = []; // Maintain a list of active sockets

async function serverRun() {
	try {		
		// Import necessary modules
		let express = require('express');
		let http = require('http');
		let socketIO = require('socket.io');
		const cors = require('cors'); // Invoke Cross-Origin Resource sharing middleware

		// Require dockerode for container management
		const Docker = require('dockerode');
		const docker = new Docker();
		const { promisify } = require('util');
		const statAsync = promisify(fs.stat);

		// Prepare Socket.io and Xterm.js client files
		await copyFiles();
		// Create Docker image if outdated
		await imageCreate();

		// Create Express app
		let app = express();

		// Enable CORS
		app.use(cors());

		// Create HTTP server
		let server = http.createServer(app);

		// Enable connection state recovery with Socket.IO
		let io = new socketIO.Server(server, {
			connectionStateRecovery: {
				maxDisconnectionDuration: 2 * 60 * 1000, // Maximum duration of disconnection in milliseconds
				skipMiddlewares: true // Whether to skip middlewares upon successful recovery
			}
		});

        // Serve static files from the 'web' directory
        app.use(express.static(path.join(__dirname, 'web')));
		
		app.get('*', function (request, response) { // Handle GET requests
			try {
				//printRequest(request);
				isAgentCLI = detectAgent(request.headers['user-agent'].toLowerCase());
				serveData(response, isAgentCLI);
			} catch (error) { console.error(error.message); }
		});
		app.post("*", (request, response) => { // Handle post requests
			try {
				//printRequest(request);
				receiveData(request);
			} catch (error) { console.error(error.message); }
		});
			
		server = http.Server(app);
		io = socketIO(server);

		const moment = require('moment'); // Use 'moment' library for timestamp handling
		let sessionMap = new Map(); // Map Session IDs to track associated sockets & data
		const authData = JSON.parse(fs.readFileSync('./config/auth.json', 'utf8')); // Load the auth.json file
		const authList = authData.auth;
		const adminList = authData.admin;

		io.on('connection', (socket) => {
			sockets.push(socket);
			let sessionId = socket.handshake.query.sessionId;
			// Generate client UUID if missing or invalid
			if (!isSessionValid(sessionId)) {
				sessionId = generateSessionId(); // Generate new session
				sessionMap.set(sessionId); // Add new map entry
				socket.emit('sessionId', sessionId); // Assign sessionId
				socket.emit('screenSize'); // Request screen data
			}
			console.log(`Client connected - Session ID: ${sessionId}`);

			socket.on('cmd', function (data) {
				try {
					const cmds = data.split(" ");
					updateSession(sessionId, { timestamp: moment() }); // Update the session timestamp

					console.debug('Input:', data);
					if (console.checkDebug()) socket.emit('output', cmds); // Echo received commands back

					let res;
					const publicCommands = ['info', 'alert', 'login', 'reload', 'help', 'theme', 'github'];
					const privateCommands = ['logout', 'console', 'terminal', 'Escape', 'exit'];
					// Check if the command partially matches any of the public commands
					const partialPublicMatch = publicCommands.find(command => command.startsWith(cmds[0]));
					const partialPrivateMatch = privateCommands.find(command => command.startsWith(cmds[0]));
			
					if (partialPublicMatch) {
						switch (partialPublicMatch){ // Public commands
							case 'info': res = cmdInfo(sessionId); break;
							case 'alert': res = cmdAlert(cmds); break;
							case 'login': res = cmdLogin(socket, sessionId, cmds[1]); break;
							case 'reload': res = "location.reload();"; break;
							case 'github':
							case 'help': res = `window.open("${helpURL}",'_blank');`; break;
							case 'theme': res = cmdTheme(socket); break;
						}
					}
					else if (partialPrivateMatch && isSessionLoggedIn(sessionId)) { // Private commands
						switch(partialPrivateMatch) {
							case 'logout': res = cmdLogout(socket, sessionId); break;
							case 'console': cmdTerminal(socket, sessionId); break;
							case 'terminal': cmdTerminal(socket, sessionId, true); break;
							case 'Escape':
							case 'exit': cmdReset(socket, sessionId); break;
						}
					}
					if (res) socket.emit('eval', res); // Send payload to client
					//printSessionMap(); // Display sessionMap data
				} catch (error) { console.error(error); }
			});

			// Handle disconnection
			socket.on('disconnect', () => {
				try {
					sockets = sockets.filter(s => s !== socket);
					console.log(`Client disconnected - Session ID: ${sessionId}`);
				} catch (error) { console.error(error); }
			});

			socket.on('coordinates', function (data) {
				try {
					if (data.split(",").length === 4) {
						let coordinates = data.split(",");
						coordinatesHandle(socket, sessionId, coordinates);
						console.debug('Pos:', coordinates);
						if (console.checkDebug()) socket.emit('output', coordinates);
					}
				} catch (error) { console.error(error); }
			});

			socket.on('screenSize', function (size) {
				try {
					updateSession(sessionId, { screenWidth: size.width, screenHeight: size.height});
				} catch (error) { console.error(error); }
			});
		});

		function cmdInfo(sessionId) {
			const sessionData = sessionMap.get(sessionId);
			const { timestamp, containerId, loggedIn, isAdmin, screenWidth, screenHeight } = sessionData ?? '';
			return `console.warn("Session ID: ${sessionId}` +
				   `\\nTimestamp: ${timestamp}` +
				   `\\nLoginStatus: ${!!(loggedIn)}` +
				   `\\nAdminStatus: ${!!(isAdmin)}` +
				   `\\nContainer ID: ${containerId}` +
				   `\\nScreen: ${screenWidth} x ${screenHeight}");`;
		}
		
		function cmdAlert(cmds){
			cmds.shift(); // trim mostleft "alert" entry
			let message = cmds.join(" "); // reconstruct message
			return `alert("${message}");`;
		}

		// Function to compare password with hashed passwords in authList
		const bcrypt = require('bcrypt');
		function comparePassword(sessionId, pass) {
			let isAdmin = adminList.some((hash) => bcrypt.compareSync(pass, hash));
			let isValid = authList.some((hash) => bcrypt.compareSync(pass, hash));
			if (isAdmin)  updateSession(sessionId, { isAdmin: true });
			return isAdmin || isValid;
		}
		function cmdLogin(socket, sessionId, pass) {
			if (isSessionLoggedIn(sessionId)) return cmdLogout(socket, sessionId); // Logout if no pass & already logged in
			else if (pass) {
				if (comparePassword(sessionId, pass)) {
					console.debug(`Succeeded login attempt with password "${pass}" from Session ID ${sessionId}`);
					updateSession(sessionId, { loggedIn: true });
					const validScript = fs.readFileSync('./stream/valid.js', 'utf8');
					socket.emit('eval', validScript);
					return `console.warn("Logged in");`; // Only notify if login is successful
				}
				else console.debug(`Failed login attempt with password "${pass}" from Session ID ${sessionId}`);
			}
		}

		function cmdLogout(socket, sessionId) {
			console.log(`Session ID ${sessionId} logged out`);

			// Update session map with loggedIn status
			updateSession(sessionId, { loggedIn: false });
			const validScript = fs.readFileSync('./stream/valid.js', 'utf8');
			socket.emit('eval', validScript);
			return `console.warn("Logged out");`;
		}

		function cmdTheme(socket) { // Invert everything
			const themeScript = fs.readFileSync('./stream/theme.js', 'utf8');
			socket.emit('eval', themeScript);
		}

		function cmdReset(socket, sessionId) { // Reset the client page
			updateSession(sessionId, { containerId: null });
			const resetScript = fs.readFileSync('./stream/reset.js', 'utf8');
			socket.emit('eval', resetScript);
		}

		const pty = require('node-pty');
		const os = require('os');
		async function cmdTerminal(socket, sessionId, local=false) { // Create terminal for the client
			let sessionData = sessionMap.get(sessionId);
			let isAdmin = sessionData.isAdmin;
			let containerId = sessionData.containerId;
			let screenWidth = sessionData.screenWidth;
			let screenHeight = sessionData.screenHeight;

			// Use the stored screen size information to calculate cols and rows
			const cols = Math.floor(screenWidth / 8); // Character width of 8px
			const rows = Math.floor(screenHeight / 16); // Character height of 16px

			// Create a new pseudo-terminal with a shell command (e.g., bash)
			let shell;
			if (!containerId && local && isAdmin) { // Attach local console
				shell = pty.spawn(os.platform() === 'win32' ? 'cmd.exe' : 'bash', [], {
					name: 'xterm-color',
					/*cols: cols,
					rows: rows,*/
					cwd: process.env.HOME,
					env: process.env
				});
				shell.write('echo Hello there!\r\n');
				containerId = "asd"; // Assign generated terminal name
				console.debug(`Spawned terminal: ${containerId}`); // Use this block to execute  cli.sh
			}
			else if (!containerId) { // Attach docker console
				// Create and start a new Docker container
				const containerId = await containerCreate();
				if (containerId) {
					// Update the sessionMap with the containerId
					updateSession(sessionId, { containerId: containerId });
		
					// Attach to the Docker container's pseudo-terminal
					shell = pty.spawn('docker', ['attach', containerId], {
						name: 'xterm-color',
						cwd: process.env.HOME,
						env: process.env
					});
					shell.write('clear && motd\n');
					console.debug(`Spawned container: ${containerId}`);
				}
				else console.debug('Failed to create and start Docker container: ' + shell);
			}
			if (shell){
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
					cmdReset(socket, sessionId);
					// Perform any cleanup or handle the closure here
				});
				// Return the JavaScript code to create the terminal on client-side
				const terminalScript = fs.readFileSync('./stream/terminal.js', 'utf8');
				socket.emit('eval', terminalScript);
			} else socket.emit('eval', `console.warn("Couldn't connect to terminal");`);
		}

		// Handle various screen coordinates, trigger keyboard
		function coordinatesHandle(socket, sessionId, coords) {
			let sessionData = sessionMap.get(sessionId);
			let widthCenter = sessionData.screenWidth / 2;
			let heightCenter = sessionData.screenHeight / 2;
			
			let [posX, posY] = coords;

			if ( (coords[0] < widthCenter * 1.2) && (posX > widthCenter * 0.8) && (posY < heightCenter * 1.2) && (posY > heightCenter * 0.8) ) {
				const keyboardScript = fs.readFileSync('./stream/keyboard.js', 'utf8');
				socket.emit('eval', keyboardScript);
			}
		}

		const uuid = require('uuid'); // Import the ID package
		// Function to generate UUIDs as session IDs
		function generateSessionId() {
			return uuid.v4();
		}

		// Function to validate session UUIDs
		function isSessionValid(sessionId) {
			return !!(sessionMap.has(sessionId));
		}

		// Function to check if a session is logged in
		function isSessionLoggedIn(sessionId) {
			return !!(sessionMap.get(sessionId).loggedIn);
		}

		// Function to remove expired sessions & cleanup containers
		function removeExpiredSessions() {
			const now = moment();
			for (const [sessionId, sessionData] of sessionMap.entries()) {
				if (sessionData.timestamp) {
					const diff = now.diff(sessionData.timestamp, 'minutes');
					if (diff > sessionTimeout) {
						// Check if sessionData contains containerId information
						containerRemove(sessionData.containerId);
						sessionMap.delete(sessionId); // Delete the timed out session entry					
					}
				}
			}
		}
		// Timer to periodically remove expired sessions (every minute)
		setInterval(removeExpiredSessions, 60000);

		// Function to update the sessionMap while making sure to maintain existing values.
		function updateSession(sessionId, newData) {
			const existingData = sessionMap.get(sessionId);
			const updatedData = { ...existingData, ...newData };
			sessionMap.set(sessionId, updatedData);
		}

		// Helper function to keep track of sessionMap values
		function printSessionMap() {
			console.debug(`Session Map Data, total entries '${sessionMap.size}':`);
			sessionMap.forEach((value, key) => {
				const sessionData = sessionMap.get(key);
				const { timestamp, containerId, loggedIn, screenWidth, screenHeight } = sessionData ?? '';
				console.debug(`Session ID: ${key}` +
					`\nTimestamp: ${timestamp}` +
					`\nContainer ID: ${containerId}` +
					`\nLoginStatus: ${loggedIn}` +
					`\nScreen: ${screenWidth} x ${screenHeight}`);
			});
		}

		async function imageCreate() {
			try {
				const imageName = 'sandboxImage';
				const dockerfilePath = './container/Dockerfile';
				const entrypointPath = './container/entrypoint.sh';

				// Check if the Dockerfile or entrypoint file has been modified
				const [dockerfileStats, entrypointStats] = await Promise.all([
					statAsync(dockerfilePath),
					statAsync(entrypointPath)
				]);

				// Get the creation date of the Docker image
				let imageCreatedTime;
				try {
					const image = await docker.getImage(imageName);
					const inspectData = await image.inspect();
					imageCreatedTime = new Date(inspectData.Created);
				} catch (error) {
					// Image does not exist
					imageCreatedTime = new Date(0);
				}

				// Compare modification times of Dockerfile and entrypoint with image creation time
				if (dockerfileStats.mtime > imageCreatedTime || entrypointStats.mtime > imageCreatedTime) {
					console.debug('Creating new Docker image.');
					// Create the new image
					const tarStream = await docker.buildImage({
						context: process.cwd(),
						src: ['./container']
					}, { t: imageName });

					await new Promise((resolve, reject) => {
						docker.modem.followProgress(tarStream, (err, res) => {
							if (err) {
								reject(err);
							} else {
								resolve(res);
							}
						});
					});

					console.debug('Docker image created successfully.');
				} else {
					console.debug('Docker image is up to date. No need to create a new image.');
				}
			} catch (error) {
				console.error('Failed to create Docker image:', error);
			}
		}

		async function containerCreate() {
			try {
				// Create a new Docker container with the --rm flag
				const container = await docker.createContainer({
					Image: 'sandboxImage',
					Tty: true,
					AttachStdin: true,
					AttachStdout: true,
					AttachStderr: true,
					OpenStdin: true,
					StdinOnce: false,
					Cmd: ['/bin/bash'], // or any other command you want to run
					HostConfig: {
						AutoRemove: true // Set the --rm flag
					}
				});
		
				// Start the container
				await container.start();
		
				// Return the container ID
				return container.id;
			} catch (error) {
				console.error('Error creating and starting Docker container:', error);
				return null;
			}
		}
		
		async function containerRemove(containerId) {
			try {
				const container = docker.getContainer(containerId);
				await container.stop(); // Stop the container
				await container.remove(); // Remove the container
				console.log(`Container ${containerId} removed successfully.`);
			} catch (error) {
				console.error(`Error removing container ${containerId}:`, error);
			}
		}
		

		function printRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}	

		function detectAgent(user) {
			return !!(user.includes('curl') || user.includes('shell'));
		}

		function serveData(response, isAgentCLI) {
			console.debug("Browser Agent: " + !isAgentCLI);
			response.sendFile(path.join(__dirname, isAgentCLI ? './cli.sh' : './web/index.html'));
		}

		function receiveData(request) {
			console.debug("Transmitted Data: " + request.body);
		}

		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', function (text) { // Allow console commands
			switch(text.trim().toLowerCase()) {
				case 'restart': serverRestart(server); break;
				case 'stop': serverShutdown(server); break;
				case 'debug': console.log(`Debug Status: ${console.toggleDebug()}`); break;
				case 'help': console.log(helpText); break;
				case '': break; // Handle empty cmds (e.g. just 'Enter')
				default: console.log(`Unknown command`);
			}
		});
		
		console.log(`${serverName} WebApp started`); // Notify that the server has been started
		program = server.listen(serverPort, () => { // Bind the server to the specified port
			console.log(`Now listening on ${serverAddress}:${serverPort}`);
		});
	} catch (error) { console.error(`[ERROR] ${error.message}`); }
}

// Copy socket.io and xterm.js files
async function copyFiles() {
    const filePairs = [
        [
            path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.min.js'),
            path.join(__dirname, 'web/inc/socket.io/socket.io.min.js')
        ],
        [
            path.join(__dirname, 'node_modules/xterm/css/xterm.css'),
            path.join(__dirname, 'web/inc/xterm/xterm.css')
        ],
        [
            path.join(__dirname, 'node_modules/xterm/lib/xterm.js'),
            path.join(__dirname, 'web/inc/xterm/xterm.js')
        ],
        [
            path.join(__dirname, 'node_modules/xterm-addon-fit/lib/xterm-addon-fit.js'),
            path.join(__dirname, 'web/inc/xterm/xterm-addon-fit.js')
        ]
    ];
    try {
        for (const [src, dest] of filePairs) {
            const srcStat = await fs.stat(src);
            const destStat = await fs.stat(dest);

            // Check if source file is newer than destination file
            if (srcStat.mtime > destStat.mtime) {
                await fs.ensureDir(path.dirname(dest));
                await fs.copyFile(src, dest);
                console.debug(`Copied ${src} to ${dest}`);
            } else {
                console.debug(`File ${src} is up to date. No need to copy.`);
            }
        }
    } catch (error) {
        console.error('Failed to copy files:', error);
    }
}

function serverRestart(server) {
    sockets.forEach(socket => { socket.disconnect(true); }); // Disconnect sockets
	server.close(() => {});
	program.close(() => { console.log(`${serverName} WebApp restarting`); }); // Close the server, trigger restart
	serverRun(); // server doesn't close properly, needs fixing
}
function serverShutdown(server) { // Graceful shutdown function, forces shutdown if exit process fails
    sockets.forEach(socket => { socket.disconnect(true); }); // Disconnect sockets
    program.close(() => { process.exit(0); });
	console.log(`${serverName} WebApp stopped`);
    setTimeout(() => { serverTerminate(); }, 100); // Force shutdown if server hasn't stopped within 0.1s
}
function serverTerminate() {
	console.error(`${serverName} WebApp terminated`);
	process.exit(12);
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
process.on('SIGINT', serverShutdown);

serverRun(); // Start the async server function
