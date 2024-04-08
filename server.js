// server.js

require('dotenv').config({ path: './config/config.cfg' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverAddress = process.env.SERVER_ADDRESS;
const helpURL = process.env.HELP_URL;

const helpText = `Visit ${helpURL} for more information
RESTART   Restart the server instance.
STOP      Shutdown the server instance.
DEBUG     Toggle verbose mode used for debugging.
HELP      Print this message.`;
const mainDir = process.cwd(); // Define server.js directory

const path = require('path'); // Allows working with file & directory paths
const utility = require('./extension/utility.js'); // Require utility extension
const console = require('./extension/logging.js'); // Use the logging functionality inside the logging.js file
const cmd = require('./extension/cmd.js'); // Access cmd module to handle transmitted commands
const dock = require('./extension/dockerode.js'); // Use dockerode module to handle containers & images
const session = require('./extension/session.js'); // Import module to handle sessions
const coordinates = require('./extension/coordinates.js'); // Import module to handle sessions

let program; // Declare program variable
let sockets = []; // Maintain a list of active sockets

async function serverRun() {
	try {
		session.loadAuth(); // Load authData file
		session.loadMap(); // Load sessionMap file
		await session.removeExpired(); // Remove expired sessions
		if (await dock.isRunning) { // Check if Docker is active
			await dock.containerPurge(session.map); // Purge unused containers
			await dock.imageCreate(); // Create Docker image if outdated
		} else console.warn("Docker is unavailable.");
		await utility.copyFiles(path, mainDir); // Prepare Socket.io and Xterm.js client files

		// Import modules
		let express = require('express');
		let http = require('http');
		let socketIO = require('socket.io');
		const cors = require('cors'); // Invoke Cross-Origin Resource sharing middleware
		const { RateLimiterMemory } = require('rate-limiter-flexible'); // Rate-limiter
		const rateLimiter = new RateLimiterMemory( { points: 5, duration: 1 }); // Max 5 points per second

		let app = express(); // Create main app using express framework
		app.use(cors()); // Enable CORS (Cross-origin resource sharing)
		
        // Serve static files from the 'web' directory
        app.use(express.static(path.join(mainDir, 'web')));
		app.get('*', function (request, response) { // Handle GET requests
			try {
				//printRequest(request);
				isAgentCLI = detectAgent(request.headers['user-agent']);
				serveData(response, isAgentCLI);
			} catch (error) { console.error(error.message); }
		});
		app.post("*", (request, response) => { // Handle post requests
			try {
				//printRequest(request);
				receiveData(request);
			} catch (error) { console.error(error.message); }
		});

		let server = http.createServer(app); // Create HTTP server
		let io = new socketIO.Server(server, { // Enable connection state recovery with Socket.IO
			connectionStateRecovery: {
				maxDisconnectionDuration: 2 * 60 * 1000, // Max 2min disconnection
				skipMiddlewares: true // Whether to skip middlewares upon successful recovery
			}
		});
		
		server = http.Server(app);
		io = socketIO(server);

		io.on('connection', (socket) => {
			const moment = require('moment'); // Use 'moment' library for timestamp handling
			sockets.push(socket); // Add new sockets entry
			let sessionId = socket.handshake.query.sessionId; // Retrieve sessionId from client
			let sessionIp = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address; // Use "x-forwarded-for", or fall back to address

			// Generate client UUID if missing or invalid
			if (!session.isValid(sessionId, sessionIp)) {
				sessionId = session.create(); // Generate new unused sessionId		
				session.init(sessionId, sessionIp); // Initialize connection, provide sessionIp
			}
			//else session.init(sessionId); // Initialize connection

			socket.emit('sessionId', sessionId); // Assign sessionId
			socket.emit('screenSize'); // Request screen data

			console.log(sessionId, `- Client Connected @ ${sessionIp}`);

			socket.on('cmd', async (data) => {
				try {
					await rateLimiter.consume(socket.handshake.address); // consume 1 point per event from IP
					const cmds = data.split(" ");
					session.update(sessionId, { timestamp: moment() }); // Update timestamp

					console.debug(sessionId, `- Input: ${data}`);
					if (session.isDebug(sessionId)) socket.emit('output', cmds); // Echo received commands back if debugging enabled

					let res;
					const publicCommands = ['info', 'alert', 'login', 'reload', 'help', 'theme', 'github'];
					const privateCommands = ['logout', 'console', 'reset', 'escape', 'exit', 'debug'];
					const adminCommands = ['terminal'];
					// Check if the command partially matches any of the public commands
					const partialPublicMatch = publicCommands.find(command => command.startsWith(cmds[0].toLowerCase()));
					const partialPrivateMatch = privateCommands.find(command => command.startsWith(cmds[0].toLowerCase()));
					const partialAdminMatch = adminCommands.find(command => command.startsWith(cmds[0].toLowerCase()));

					const isLoggedIn = session.isLoggedIn(sessionId);
					const isAdmin = session.isAdmin(sessionId);
			
					if (partialPublicMatch) {
						switch (partialPublicMatch){ // Public commands
							case 'info': res = cmd.info(sessionId); break;
							case 'alert': res = cmd.alert(cmds); break;
							case 'login': res = cmd.login(socket, sessionId, cmds[1]); break;
							case 'reload': res = "location.reload();"; break;
							case 'github':
							case 'help': res = `window.open("${helpURL}",'_blank');`; break;
							case 'theme': res = cmd.theme(socket); break;
						}
					}
					else if (partialPrivateMatch && isLoggedIn) { // Private commands
						switch(partialPrivateMatch) {
							case 'logout': res = cmd.logout(socket, sessionId); break;
							case 'console': cmd.terminal(socket, sessionId); break;
							case 'reset': cmd.resetTerminal(socket, sessionId); break;
							case 'debug': res = cmd.debug(sessionId); break;
							case 'escape':
							case 'exit': cmd.reset(socket); break;
						}
					}
					else if (partialAdminMatch && isLoggedIn && isAdmin) { // Admin commands
						switch(partialAdminMatch) {
							case 'terminal': cmd.terminal(socket, sessionId, true); break;
						}
					}
					if (res) socket.emit('eval', res); // Send payload to client
				} catch (error) { console.debug(sessionId, error); }
			});

			socket.on('coordinates', async (data) => {
				try {
					await rateLimiter.consume(socket.handshake.address); // consume 1 point per event from IP
					if (data.split(",").length === 4) {
						let pos = data.split(",");
						coordinates.handle(socket, sessionId, pos);
						console.debug(sessionId, `- Coords: ${pos}`);
						if (session.isDebug(sessionId)) socket.emit('output', pos);
					}
				} catch (error) { console.debug(sessionId, error); }
			});

			socket.on('screenSize', async (size) => {
				try {
					await rateLimiter.consume(socket.handshake.address); // consume 1 point per event from IP
					session.update(sessionId, { screenWidth: size.width, screenHeight: size.height});
				} catch (error) { console.debug(sessionId, error); }
			});

			// Handle disconnection
			socket.on('disconnect', () => {
				try {
					sockets = sockets.filter(s => s !== socket);
					console.log(sessionId, `- Client Disconnected @ ${sessionIp}`);
				} catch (error) { console.debug(error); }
			});
		});

		function printRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}	

		function detectAgent(user) {
			if (user) user = user.toLowerCase();
			return !!(user.includes('curl') || user.includes('shell'));
		}

		function serveData(response, isAgentCLI) {
			console.debug("Browser Agent: " + !isAgentCLI);
			response.sendFile(path.join(mainDir, isAgentCLI ? './cli.sh' : './web/index.html'));
		}

		function receiveData(request) {
			console.debug("Transmitted Data: " + request.body);
		}

		const commands = ['', 'debug', 'reload', 'restart', 'quit', 'stop', 'help', 'print', 'test']; // Available cmds
		process.stdin.setEncoding('utf8')
		process.stdin.on('data', function (text) { // Handle console commands
			const consoleInput = text.trim().split(" ");
			const partialCommandMatch = commands.find(cmd => cmd.startsWith(consoleInput[0].toLowerCase())); // Check for partial cmd match
			switch(partialCommandMatch) {
				case '': break; // Handle empty cmds (e.g. just 'Enter')
				case 'debug': console.info(`Debug Status: ${console.toggleDebug() ? 'Enabled' : 'Disabled'}`); break;
				case 'reload':
				case 'restart': serverRestart(server); break;
				case 'quit':
				case 'stop': serverShutdown(server); break;
				case 'print': session.printMap(); break;
				case 'test': console.debug(utility.generateName()); break;
				default: console.info(`Unknown command`); break;
			}
		});


		console.log(`${serverName} WebApp started`); // Notify that the server has been started
		program = server.listen(serverPort, () => { // Bind the server to the specified port
			console.log(`Now listening on ${serverAddress}:${serverPort}`);
		});

		// Timer to periodically remove expired sessions (every 60s)
		setInterval(session.removeExpired, 60 * 1000);

	} catch (error) { console.error(`[ERROR] ${error.message}`); }
}

function serverRestart(server) {
    session.storeMap(); // Save current sessionMap
    server.close(() => {
		process.stdin.removeAllListeners('data');
		console.log(`${serverName} WebApp restarting`);
		serverRun(); // Start a new server instance after the previous one has fully closed
	});
}
function serverShutdown(server) { // Graceful shutdown function, forces shutdown if exit process fails
	session.storeMap(); // Save current sessionMap
	//sockets.forEach(socket => { socket.disconnect(true); }); // Disconnect sockets on shutdown
    program.close(() => { process.exit(0); });
	console.log(`${serverName} WebApp stopped`);
    setTimeout(() => { serverTerminate(); }, 250); // Force shutdown if server hasn't stopped within 0.25s
}
function serverTerminate() {
	console.error(`${serverName} WebApp terminated`);
	process.exit(12);
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
process.on('SIGINT', serverShutdown);

serverRun(); // Start the async server function
