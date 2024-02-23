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
const session = require('./session.js');

async function imageCreate() {
    try {
        const dockerfilePath = './container/Dockerfile';
        const entrypointPath = './container/entrypoint.sh';
        const splashPath = './container/splash.sh';

        // Check if the Dockerfile, entrypoint.sh or splash.sh files have been modified
        const [dockerfileStats, entrypointStats, splashStats] = await Promise.all([
            statAsync(dockerfilePath),
            statAsync(entrypointPath),
            statAsync(splashPath)
        ]);

        // Get the creation date of the Docker image
        let imageCreatedTime;
        try {
            const image = docker.getImage(imageName);
            const inspectData = await image.inspect();
            imageCreatedTime = new Date(inspectData.Created);
        } catch (error) { imageCreatedTime = new Date(0); } // Image does not exist

        // Compare modification times of Dockerfile, entrypoint.sh and splash.sh with image creation time
        if (dockerfileStats.mtime > imageCreatedTime || entrypointStats.mtime > imageCreatedTime || splashStats.mtime > imageCreatedTime) {
            // Get a list of all images
            const images = await docker.listImages();

            // Remove the existing image with the specified name
            const existingImage = images.find(image => image.RepoTags.includes(imageName));
            if (existingImage) {
                console.log(`Removing existing image: ${imageName}`);
                const image = docker.getImage(existingImage.Id);
                await image.remove({ force: true });
                console.log(`Image ${imageName} removed successfully.`);
            } else {
                console.log(`Image ${imageName} does not exist.`);
            }

            // Remove dangling and "<none>" images
            const danglingImages = images.filter(image => {
                return (image.RepoTags.includes('<none>') || image.RepoTags.length === 0);
            });
            for (const danglingImage of danglingImages) {
                console.log(`Removing dangling image: ${danglingImage.Id}`);
                const image = docker.getImage(danglingImage.Id);
                await image.remove({ force: true });
                console.log(`Dangling image ${danglingImage.Id} removed successfully.`);
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

async function containerGetName(containerId) {
    const container = docker.getContainer(containerId); // Retrieve container object
    const containerInfo = await container.inspect(); // Get the container info
    const containerName = containerInfo.Name.substring(1); // Remove the leading "/" from the container name
    
    return containerName; // Return extracted name
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
            Cmd: ['/bin/ash'],
            HostConfig: {
                //AutoRemove: true // Set the --rm flag
            }
        });

        // Start the container
        await container.start();

        // Return the containerId
        return container.id;
    } catch (error) { console.error('Error creating and starting Docker container: ', error); return null; }
}

// Function to remove a container
async function containerRemove(containerId) {
    const containerName = containerGetName(containerId);
    try {
        const container = docker.getContainer(containerId); // Get Container object
        await container.remove(); // Remove the container
        console.log(`Container successfully ${containerName} removed.`);
    } catch (error) { console.error(`Error removing container ${containerName}: `, error); }
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
                // Remove the container
                const containerName = containerGetName(containerInfo.Id);
                console.info(`Removing container ${containerName}`);
                const container = docker.getContainer(containerInfo.Id);
                await container.stop();
                await container.remove();
            }
        }
    } catch (error) { console.error('Error removing containers not in session map:', error); }
}

module.exports = {
    imageCreate,
    containerGetName,
    containerCreate,
    containerRemove,
    containerPurge,
};