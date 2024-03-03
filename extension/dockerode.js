// extension/dockerode.js

require('dotenv').config({ path: './config/config.cfg' }); // Access parameters in the config.ini file
const imageName = process.env.DOCKER_IMAGE;
const containerMemory = process.env.DOCKER_MEMORY;
const containerDiskspace = process.env.DOCKER_DISKSPACE;

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
        const splashPath = './container/splash.sh';

        // Check if the Dockerfile, entrypoint.sh or splash.sh file has been modified
        const [dockerfileStats, entrypointStats, splashStats] = await Promise.all([
            statAsync(dockerfilePath),
            statAsync(entrypointPath),
            statAsync(splashPath)
        ]);

        // Get the creation date of the Docker image
        let imgTime;
        try {
            const image = docker.getImage(imageName);
            const inspectData = await image.inspect();
            imgTime = new Date(inspectData.Created);
        } catch (error) { imgTime = new Date(0); } // Image does not exist

        // Get a list of all images
        const images = await docker.listImages();
        // Remove dangling and "<none>" images
        const danglingImages = images.filter(image => {
            return (image.RepoTags.includes('<none>') || image.RepoTags.length === 0);
        });
        for (const danglingImage of danglingImages) {
            console.debug(`Removing dangling image: ${danglingImage.Id}`);
            const image = docker.getImage(danglingImage.Id);
            await image.remove({ force: true });
            console.info(`Dangling image ${danglingImage.Id} removed successfully.`);
        }

        // Compare modification times of Dockerfile, entrypoint.sh and splash.sh with image creation time
        if (dockerfileStats.mtime > imgTime || entrypointStats.mtime > imgTime || splashStats.mtime > imgTime) {

            // Remove the existing image with the specified name
            const existingImage = images.find(image => image.RepoTags.includes(imageName));
            if (existingImage) {
                console.info(`Removing existing image "${imageName}"`);
                const image = docker.getImage(existingImage.Id);
                await image.remove({ force: true });
                console.info(`Image "${imageName}" removed successfully.`);
            } else {
                console.info(`Image "${imageName}" does not exist.`);
            }
            
            console.info(`Creating new Docker image "${imageName}:latest".`);
            // Create the new image
            docker.buildImage({
                context: `${mainDir}/container/`,
                src: ['Dockerfile', 'entrypoint.sh', 'splash.sh'] },
                { t: `${imageName}:latest` },
                (err, stream) => {
                    if (err) { console.error(err); return; }

                    docker.modem.followProgress(stream, onFinished, onProgress);

                    function onFinished(err, output) {
                        if (err) { console.error(err); }
                        else { console.info(`Docker image "${imageName}:latest" created successfully`); }
                        //else { console.debug(`Docker image "${imageName}:latest" created successfully: `, output); }
                    }

                    function onProgress(event) {
                        console.debug(event);
                    }
                }
            );
        } else console.info(`Docker image "${imageName}:latest" is up to date.`);
    } catch (error) { console.error('Failed to create Docker image: ', error); }
}

// Get containerName from containerId
async function containerGetName(containerId) {
    const container = docker.getContainer(containerId); // Retrieve container object
    const containerInfo = await container.inspect(); // Get the container info
    const containerName = containerInfo.Name.substring(1); // Remove the leading "/" from the container name
    
    return containerName; // Return extracted name
}

async function containerCreate() {
    try {
        if (isRunning = isDockerActive()) {
            // Create a new Docker container with the --rm flag
            const container = await docker.createContainer({
                Image: imageName,
                Tty: true,
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                OpenStdin: true,
                StdinOnce: false,
                Cmd: ['/bin/sh'],
                HostConfig: {
                    Memory: containerMemory * 1000 * 1000,
                    StorageOpt: { 'size': `${containerDiskspace}G` }
                }
            });
    
            // Start the container
            await container.start();
    
            // Return the containerId
            return container.id;
        } else throw "Docker engine not running"; // Break if Docker engine is not running
    } catch (error) { console.error('Error creating and starting container:', error); }
}

// Function to check if a container is running
async function containerRunning(containerId) {
    try {
        const container = docker.getContainer(containerId);
        const data = await container.inspect();
        return data.State.Running;
    } catch (error) {
        console.error(`Error checking container ${containerId} status:`, error);
        return false; // Assume container is not running in case of error
    }
}

// Function to check if a container exists
async function containerExists(containerId) {
    try {
        // Attempt to get the container object
        const container = docker.getContainer(containerId);
        await container.inspect(); // Try to inspect the container
        return true; // Container exists
    } catch (error) {
        // If an error occurs, the container doesn't exist
        return false;
    }
}

// Function to remove a container
async function containerRemove(containerId) {
    try {
        const containerName = await containerGetName(containerId);

        if (await containerExists(containerId)) {
            // Container exists, proceed with removal
            const container = docker.getContainer(containerId);
            await container.remove(); // Remove the container
            console.log(`Container ${containerName} successfully removed.`);
        } else {
            // Container doesn't exist, notify the user
            console.log(`Container ${containerName} no longer exists.`);
        }
    } catch (error) {
        // Handle any errors during container removal
        console.error('Error removing container:', error);
    }
}

// Function to remove all containers that aren't actively used
async function containerPurge(map) {
    try {
        // Get all running containers
        const containers = await docker.listContainers({ all: true });

        // Iterate through each container
        for (const containerInfo of containers) {
            // Check if the container ID exists in the session map
            if (!map.has(containerInfo.Id)) {
                // Check if the container exists and is running
                const containerId = containerInfo.Id;
                const exists = await containerExists(containerId);
                if (exists) {
                    const running = await containerRunning(containerId);
                    const containerName = await containerGetName(containerId);
                    if (running) {
                        // Stop the container before removing it
                        console.debug(`Stopping container ${containerName}`);
                        const container = docker.getContainer(containerId);
                        await container.stop();
                    }
                    // Remove the container
                    console.debug(`Removing container ${containerName}`);
                    const container = docker.getContainer(containerId);
                    await container.remove();
                } else {
                    console.debug(`Container ${containerId} does not exist.`);
                }
            }
        }
        console.info(`Containers purged: ${containers.length}`);
    } catch (error) {
        console.error('Error removing containers not in session map:', error);
    }
}

// Check if the Docker instance is running
async function isDockerActive() {
    try {
        await docker.ping(); // Ping the Docker daemon
        return true; // If ping succeeds, Docker is running
    } catch (error) {
        return false; // If ping fails, Docker is not running
    }
};
let isRunning = isDockerActive();

module.exports = {
    imageCreate,
    containerGetName,
    containerCreate,
    containerRunning,
    containerRemove,
    containerPurge,
    isRunning
};