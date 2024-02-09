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

const path = require('path'); // Allows working with file & directory paths
const console = require('./log.js'); // Use the logging functionality inside the log.js file
const express = require('express'); // Make use of the express.js framework for the core application
const app = express();

let server; // Declare server variable

async function serverRun() {
	try {		
		console.log(`${serverName} started`); // Notify that the server has been started
		server = app.listen(serverPort, () => { console.log(`Now listening on port ${serverAddress}:${serverPort}`); }); // Bind the server to the specified port
				
		function printRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}
		let isAgentCLI = false;
		app.get("*", (request, response) => { // Handle GET requests
			try {
				printRequest(request);
				isAgentCLI = detectAgent(request.headers['user-agent'].toLowerCase())
				serveData(response, isAgentCLI);
			} catch (error) { console.error(error.message); }
		});
		
		function detectAgent(user) {
			console.log(user);
			return !!(user.includes('curl') || user.includes('shell'));
		}

		function serveData(response, isAgentCLI) {
			console.debug("CLI Agent: " + isAgentCLI);
			if (isAgentCLI) {
				response.sendFile(path.join(__dirname, './cli.sh'));
			} else {
				response.sendFile(path.join(__dirname, './inc/index.html'));
			}
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
	} catch (error) { console.error(`[ERROR] ${error.message}`); }
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
process.on('SIGINT', serverShutdown);

function serverRestart() {
	server.close(() => { console.log(`${serverName} restarted`); }); // Close the server, trigger restart
}
function serverShutdown() { // Graceful shutdown function, forces shutdown if exit process fails
	console.log(`${serverName} stopped`);
    server.close(() => { process.exit(0); });
    setTimeout(() => { serverTerminate(); }, 2000); // Force shutdown if server hasn't stopped within 2s
}
function serverTerminate() {
	console.error(`${serverName} terminated`);
	process.exit(12);
}

serverRun(); // Start the async server function