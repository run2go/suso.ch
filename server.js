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
var express = require('express'), // Make use of the express.js framework for the core application
    app = express(), // Use express app with http server
    http = require('http'), // Require http module
    socketIO = require('socket.io'),  // Integrate socket.io
    server, io;

let program; // Declare process variable

async function serverRun() {
	try {
		await copySocketFile();
		await copyXtermFiles();
		
        // Serve static files from the 'web' directory
        app.use(express.static(path.join(__dirname, 'web')));
		
		app.get('*', function (request, response) { // Handle GET requests
			//response.sendFile(__dirname + '/web/index.html');
			try {
				printRequest(request);
				isAgentCLI = detectAgent(request.headers['user-agent'].toLowerCase());
				serveData(response, isAgentCLI);
				response.sendFile(path.join(__dirname, './web/index.html'));
			} catch (error) { console.error(error.message); }
		});
		app.post("*", (request, response) => { // Handle post requests
			try {
				printRequest(request);
				receiveData(request);
			} catch (error) { console.error(error.message); }
		});
			
		server = http.Server(app);
		io = socketIO(server);
		
		io.on('connection', function (socket) {
			if (socket.recovered) { // recovered session
				console.log(`Client recovered - ${socket.id}`);
			} else { // new or unrecoverable session
				console.log(`Client connected - ${socket.id}`);
				socket.on('cmd', function (data) {
					const cmds = data.split(" "); //Parameterization worth it?
					let res = '';
					switch (cmds[0]){
						case 'debug': console.toggleDebug(); break; // Temporary
						case 'alert': {
							cmds.shift();
							res = `alert("${cmds.join(" ")}");`;
							break;
						}
						case 'logout': res = cmdLogout(); break;
						case 'login': res = cmdLogin(cmds[1]); break;
						case 'console': 
						case 'terminal': res = cmdTerminal(); break;
						case 'test': socket.to(socket.id).emit("output", "testy test"); break;
					}
					socket.emit('exec', res); // Send payload to client
					console.debug('Input:', data);
					if (console.checkDebug()) socket.emit('output', cmds); // Echo received command back
				});

				socket.on('disconnect', () => {
					// Start counter
					setTimeout(() => { containerShutdown(); }, 1200000); // => 20min
					console.log(`Client disconnected - ${socket.id}`);
				});
			  }
		});

		function cmdLogout(){
			return '';
		}

		function cmdLogin(pass){
			console.log(`Login attempt with ${pass}`);
			return '';
		}

		function cmdTerminal(){
			console.log(`Terminal toggled`);
			return '';
		}

		function printRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}	

		function detectAgent(user) {
			console.debug(user);
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
}

function containerStart(){
	// Start container, create a new container using local image
}

function containerShutdown() {
	// Shut container, --remove param will remove it
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
