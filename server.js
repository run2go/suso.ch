// server.js

require('dotenv').config({ path: 'config.cfg' }); // Access parameters in the config.ini file
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

async function serverRun() {
	try {
		// Prepare Socket.io and Xterm.js client files
		await copySocketFile();
		await copyXtermFiles();
		
		// Import necessary modules
		let express = require('express');
		let http = require('http');
		let socketIO = require('socket.io');
		const cors = require('cors'); // Invoke Cross-Origin Resource sharing middleware

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
		const authData = JSON.parse(fs.readFileSync('auth.json', 'utf8')); // Load the auth.json file
		const authList = authData.auth;

		io.on('connection', (socket) => {
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
				const cmds = data.split(" ");
				updateSession(sessionId, { timestamp: moment() }); // Update the session timestamp

				console.debug('Input:', data);
				if (console.checkDebug()) socket.emit('output', cmds); // Echo received commands back

				let res;
				switch (cmds[0]){ // Public commands
					case 'info': res = cmdInfo(sessionId); break;
					case 'alert': res = cmdAlert(cmds); break;
					case 'login': res = cmdLogin(sessionId, cmds[1]); break;
					case 'reload': res = "location.reload();"; break;
					case 'help': res = `window.open("${helpURL}",'_blank');`; break;
				}
				if (isSessionLoggedIn(sessionId)) { // Private commands
					switch(cmds[0]) {
						case 'logout': res = cmdLogout(sessionId); break;
						case 'console': res = cmdTerminal(socket, sessionId); break;
						case 'terminal': res = cmdTerminal(socket, sessionId, true); break;
						case 'exit': res = `location.reload();`; break;
					}
				}
				if (res) socket.emit('exec', res); // Send payload to client
				printSessionMap(); // Display sessionMap data
			});

			// Handle disconnection
			socket.on('disconnect', () => {
				console.log(`Client disconnected - Session ID: ${sessionId}`);
			});

			socket.on('coordinates', function (data) {
				let coordinates = data.split(",");
				console.debug('Pos:', coordinates);
				if (console.checkDebug()) socket.emit('output', coordinates);
			});

			socket.on('screenSize', function (size) {
				updateSession(sessionId, { screenWidth: size.width, screenHeight: size.height});
			});
		});

		function cmdInfo(sessionId) {
			const sessionData = sessionMap.get(sessionId);
			const { timestamp, containerId, loggedIn, screenWidth, screenHeight } = sessionData ?? '';
			return `console.log("Session ID: ${sessionId}` +
				   `\\nTimestamp: ${timestamp}` +
				   `\\nContainer ID: ${containerId}` +
				   `\\nLoginStatus: ${loggedIn}` +
				   `\\nScreen: ${screenWidth} x ${screenHeight}");`;
		}
		
		function cmdAlert(cmds){
			cmds.shift(); // trim mostleft "alert" entry
			let message = cmds.join(" "); // reconstruct message
			return `alert("${message}");`;
		}

		// Function to compare password with hashed passwords in authList
		const bcrypt = require('bcrypt');
		function comparePassword(pass) {
			return authList.some((hash) => bcrypt.compareSync(pass, hash));
		}
		function cmdLogin(sessionId, pass) {
			if (comparePassword(pass)) {
				console.debug(`Succeeded login attempt with password "${pass}" from Session ID ${sessionId}`);
				updateSession(sessionId, { loggedIn: true });
				return `console.log("Logged in");`; // Only notify if login is successful
			}
			else console.debug(`Failed login attempt with password "${pass}" from Session ID ${sessionId}`);
		}

		function cmdLogout(sessionId) {
			console.log(`Session ID ${sessionId} logged out`);

			// Update session map with loggedIn status
			updateSession(sessionId, { loggedIn: false });
			return `console.log("Logged out"); location.reload();`;
		}

		const pty = require('node-pty');
		const os = require('os');
		function cmdTerminal(socket, sessionId, local=false) { // Create terminal for the client
			let sessionData = sessionMap.get(sessionId);
			let screenWidth = sessionData.screenWidth;
			let screenHeight = sessionData.screenHeight;

			// Use the stored screen size information to calculate cols and rows
			const cols = Math.floor(screenWidth / 8); // Character width of 8px
			const rows = Math.floor(screenHeight / 16); // Character height of 16px

			// Create a new pseudo-terminal with a shell command (e.g., bash)
			let shell;
			if (local) { // Attach local console
				shell = pty.spawn(os.platform() === 'win32' ? 'cmd.exe' : 'bash', [], {
					name: 'xterm-color',
					cols: cols,
					rows: rows,
					cwd: process.env.HOME,
					env: process.env
				});
			}
			else { // Attach docker console
				shell = pty.spawn(`docker attach ${123}`, [], {
					name: 'xterm-color',
					cols: cols,
					rows: rows,
					cwd: process.env.HOME,
					env: process.env
				});
			}
			
			// Pipe the output of the pseudo-terminal to the socket
			shell.onData(data => {
				// Emit the data to the client
				socket.emit('terminalOutput', data);
			});

			// Handle input from the client and write it to the pseudo-terminal
			socket.on('terminalInput', input => {
				shell.write(input);
			});

			// Return the JavaScript code to create the terminal on client-side
			return `
				// Clear the current HTML body
				//document.body.innerHTML = '';
			
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
				terminalContainer.style.width = '100%';
				terminalContainer.style.height = '100%';
				
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
				}
				// Wait 100ms for xterm files to load
				setTimeout(() => { initializeTerminal(); }, 100);
			`;
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

		function containerCreate(){
			// Start container, create a new container using local image
		
		}
		
		function containerRemove(containerId) {
			//if (containerId) ..
			// Force delete container
		}

		function printRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}	

		function detectAgent(user) {
			return !!(user.includes('curl') || user.includes('shell'));
		}

		function serveData(response, isAgentCLI) {
			console.debug("CLI Agent: " + isAgentCLI);
			response.sendFile(path.join(__dirname, isAgentCLI ? './cli.sh' : './web/index.html'));
		}

		function receiveData(request) {
			// Placeholder
		}

		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', function (text) { // Allow console commands
			switch(text.trim().toLowerCase()) {
				case 'restart': serverRestart(); break;
				case 'stop': serverShutdown(); break;
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

async function copySocketFile(){
	const srcPath = path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.min.js');
	const destPath = path.join(__dirname, 'web/inc/socket.io/socket.io.min.js');
	await fs.ensureDir(path.dirname(destPath));
	await fs.copyFile(srcPath, destPath);
}
async function copyXtermFiles(){
	const srcPathCSS = path.join(__dirname, 'node_modules/xterm/css/xterm.css');
	const destPathCSS = path.join(__dirname, 'web/inc/xterm/xterm.css');
	await fs.ensureDir(path.dirname(destPathCSS));
	await fs.copyFile(srcPathCSS, destPathCSS);
	const srcPathJS = path.join(__dirname, 'node_modules/xterm/lib/xterm.js');
	const destPathJS = path.join(__dirname, 'web/inc/xterm/xterm.js');
	await fs.ensureDir(path.dirname(destPathJS));
	await fs.copyFile(srcPathJS, destPathJS);
	const srcPathJSaddon = path.join(__dirname, 'node_modules/xterm-addon-fit/lib/xterm-addon-fit.js');
	const destPathJSaddon = path.join(__dirname, 'web/inc/xterm/xterm-addon-fit.js');
	await fs.ensureDir(path.dirname(destPathJSaddon));
	await fs.copyFile(srcPathJSaddon, destPathJSaddon);
}

function serverRestart() {
	program.close(() => { console.log(`${serverName} restarted`); }); // Close the server, trigger restart
}
function serverShutdown() { // Graceful shutdown function, forces shutdown if exit process fails
	console.log(`${serverName} stopped`);
    program.close(() => { process.exit(0); });
    setTimeout(() => { serverTerminate(); }, 100); // Force shutdown if server hasn't stopped within 0.1s
}
function serverTerminate() {
	console.error(`${serverName} terminated`);
	process.exit(12);
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
process.on('SIGINT', serverShutdown);

serverRun(); // Start the async server function
