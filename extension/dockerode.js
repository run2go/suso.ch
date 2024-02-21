// extension/dockerode.js


require('dotenv').config({ path: './config/config.cfg' }); // Access parameters in the config.ini file
const imageName = process.env.DOCKER_IMAGE;

// Require dockerode for container management
const Docker = require('dockerode');
const docker = new Docker();
const fs = require('fs-extra'); // Use file system operations
const { promisify } = require('util');
const statAsync = promisify(fs.stat);
const mainDir = process.cwd(); // Define server.js directory
const console = require('./logging.js');

async function imageCreate() {
    try {
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
            const image = docker.getImage(imageName);
            const inspectData = await image.inspect();
            imageCreatedTime = new Date(inspectData.Created);
        } catch (error) { imageCreatedTime = new Date(0); } // Image does not exist

        // Compare modification times of Dockerfile and entrypoint with image creation time
        if (dockerfileStats.mtime > imageCreatedTime || entrypointStats.mtime > imageCreatedTime) {
            console.debug('Creating new Docker image.');
            // Create the new image
            const tarStream = await docker.buildImage({
                context: `${mainDir}/container/`,
                src: ['.'],
                options: { t: 'imageName' }
            });

            await new Promise((resolve, reject) => {
                docker.modem.followProgress(tarStream, (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });

            console.debug('Docker image created successfully.');
        } else console.debug('Docker image is up to date. No need to create a new image.');
    } catch (error) { console.error('Failed to create Docker image:', error); }
}

async function containerCreate() {
    try {
        // Create a new Docker container with the --rm flag
        const container = await docker.createContainer({
            Image: imageName,
            Tty: true,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            OpenStdin: true,
            StdinOnce: false,
            Cmd: ['/bin/bash'],
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

module.exports = {
    imageCreate,
    containerCreate,
    containerRemove,
};