// tests/default.test.js

const { spawn } = require('child_process'); // Required to spawn a test instance of the server
const path = require('path'); // Allow accessing files relative to the current directory
const request = require('supertest'); // Used to send http requests to the spawned instance
const fs = require('fs-extra'); // Use file system operations

require('dotenv').config({ path: path.resolve(__dirname, '../config/config.cfg') }); // Access parameters in the config.ini file
const serverPort = process.env.SERVER_PORT;
const serverAddress = process.env.SERVER_ADDRESS;

let serverProcess;

async function startServer() {
    const serverPath = path.resolve(__dirname, '../server.js');

    serverProcess = spawn('node', [serverPath]); // Spawn the process

    return new Promise((resolve, reject) => {
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString(); // Convert data to string
            console.log(`Process Output: ${output}`);

            // Check if the output contains the expected message
            if (output.includes(`Now listening on ${serverAddress}:${serverPort}`)) {
                // Server has started, resolve the promise
                resolve();
            }
        });

        // Handle process exit
        serverProcess.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Server exited with code ${code}`));
            }
        });
    });
}

async function stopServer() {
	serverProcess.kill('SIGKILL');
	await new Promise((resolve) => {
		serverProcess.on('exit', () => { resolve(); });
	});
}

describe('Test Suite A - Requests', () => {
    beforeAll(startServer);

    test('Test 1: Check connectivity', async () => {
        const response = await request(`${serverAddress}:${serverPort}`).get(`/`);
        expect([200, 302]).toContain(response.status);
    });
    test('Test 2: Receive website', async () => {
        const response = await request(`${serverAddress}:${serverPort}`).get(`/`);
        expect([200]).toContain(response.status);

        const htmlContent = response.text; // Retreive index.html
        const expectedHtmlContent = fs.readFileSync('./web/index.html', 'utf-8'); // Read file contents
        expect(htmlContent).toEqual(expectedHtmlContent); // Validate the content of the response
    });

    afterAll(stopServer);
});