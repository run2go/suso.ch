// server.js

require('dotenv').config({ path: 'config.cfg' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverAddress = process.env.SERVER_ADDRESS;
const helpURL = process.env.HELP_URL;

const helpText = `Visit ${helpURL} for more information
RESTART   Restart the server instance.
STOP      Shutdown the server instance.
DEBUG     Toggle verbose mode used for debugging.
HELP      Print this message.`;

const fs = require('fs-extra'); // Use file system operations
const path = require('path'); // Allows working with file & directory paths
const console = require('./log.js'); // Use the logging functionality inside the log.js file
const express = require('express'); // Make use of the express.js framework for the core application
const app = express();
const http = require('http').Server(app); // Use express app with http server
const io = require('socket.io')(http); // Integrate socket.io with http server

let program; // Declare process variable

async function serverRun() {
	try {
		async function copySocketFolder(){
			const srcPath = path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.min.js');
			const destPath = path.join(__dirname, 'web/inc/socket.io/socket.io.min.js');
			await fs.ensureDir(path.dirname(destPath));
			await fs.copyFile(srcPath, destPath);
			//const srcPath = path.join(__dirname, 'node_modules/socket.io/client-dist/');
			//const destPath = path.join(__dirname, 'web/inc/socket.io/');
			//// Copy the entire folder
			//await fs.copy(srcPath, destPath, {
			//	recursive: true,
			//	overwrite: true
			//}, fs.constants.COPYFILE_EXCL);
		}
		await copySocketFolder();

        // Integrate socket.io middleware into Express.js app
		const socket = io.of('/socket.io'); // Namespace declaration for socket.io communication
		socket.on('connection', (socket) => {
			console.log('Client connected');

			socket.on('input', (data) => {
				console.log('Received input from client:', data);
				// Process data as needed
				// For testing, let's just echo it back to the client
				socket.emit('output', `Server received input: ${data}`);
			});

			// You can handle other events here if needed
			socket.on('disconnect', () => {
				console.log('Client disconnected');
			});
		});


        // Serve static files from the 'web' directory
        app.use(express.static(path.join(__dirname, 'web')));

		function printRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}
		let isAgentCLI = false;
		app.get("*", (request, response) => { // Handle GET requests
			try {
				printRequest(request);
				isAgentCLI = detectAgent(request.headers['user-agent'].toLowerCase())
				//serveData(response, isAgentCLI);
				response.sendFile(path.join(__dirname, './web/index.html'));
			} catch (error) { console.error(error.message); }
		});
		app.post("*", (request, response) => { // Handle post requests
			try {
				printRequest(request);
				receiveData(request);
			} catch (error) { console.error(error.message); }
		});
		
		function detectAgent(user) {
			console.debug(user);
			return !!(user.includes('curl') || user.includes('shell'));
		}

		function serveData(response, isAgentCLI) {
			console.debug("CLI Agent: " + isAgentCLI);
			if (isAgentCLI) {
				response.sendFile(path.join(__dirname, './cli.sh'));
			} else {
				response.sendFile(path.join(__dirname, './web/index.html'));
			}
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
				default: console.log(`Unknown command`);
			}
		});
		
		console.log(`${serverName} started`); // Notify that the server has been started
		program = app.listen(serverPort, () => { console.log(`Now listening on port ${serverAddress}:${serverPort}`); }); // Bind the server to the specified port
	} catch (error) { console.error(`[ERROR] ${error.message}`); }
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
process.on('SIGINT', serverShutdown);

function serverRestart() {
	program.close(() => { console.log(`${serverName} restarted`); }); // Close the server, trigger restart
}
function serverShutdown() { // Graceful shutdown function, forces shutdown if exit process fails
	console.log(`${serverName} stopped`);
    program.close(() => { process.exit(0); });
    setTimeout(() => { serverTerminate(); }, 2000); // Force shutdown if server hasn't stopped within 2s
}
function serverTerminate() {
	console.error(`${serverName} terminated`);
	process.exit(12);
}

serverRun(); // Start the async server function
