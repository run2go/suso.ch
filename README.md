# suso.ch ![suso.ch](./web/inc/logo.svg)
### _Interactive Cross-Platform WebApp_
#### CLI focused WebApp which temporarily spawns and attaches container terminals

Makes use of Express.js with Socket.io as WebApp Framework, node-pty along with xterm.js for terminals and dockerode to dynamically control docker containers.

## Tech
The suso.ch WebApp makes use of the following tools & software:

- [Node.js] (JavaScript Runtime Environment)
- [Express.js] (Node.js Webserver Framework)
- [Socket.io] (Library for Realtime WebApps)
- [xterm.js] (JavaScript Frontend Terminal)
- [node-pty] (Fork pseudoterminals in Node.js)
- [dockerode] (Docker Remote API)

## Setup
Download the repository using git
```sh
git pull https://github.com/run2go/suso.ch.git
```

Switch into the suso.ch directory
```sh
cd suso.ch
```

Build the WebApp image
```sh
docker build --tag webapp:latest .
```

Run a container using the WebApp image
```sh
docker run -it -d --name suso -p 80:3000 --cap-add=NET_ADMIN webapp:latest
```

## Usage
Attach the console
```sh
docker attach suso
```

Detach the console using: `CTRL+P + CTLR+Q`

Enter "`help`" into the console to get an overview of the available serverside CLI commands.

## Container Tools
The dynamically spawned containers come with default tools like these:

| _Programs_ | _Description_ |
| ------ | ------ |
| `tunnel` | Handle cloudflared quick tunnels |
| `docker` | Containerization software |
| `htop` | Interactive Task Manager |
| `nano` | Simple text editor |

Additionally, there is the "`net-tools`" package included, providing various networking utilities.

## Session Map Structure
Sample sessionMap.json containing the variables per sessionId:
```json
[
    [
        "<UUID>",
        {
            "sessionIp": "1.1.1.1",
            "containerId": null,
            "containerName": null,
            "isDebug": false,
            "isAdmin": false,
            "isLoggedIn": false,
            "screenWidth": 1920,
            "screenHeight": 1080,
            "timestamp": "1970-01-01T00:00:00.000Z"
        }
    ]
]
```

## License

MIT

[//]: #
   [node.js]: <http://nodejs.org>
   [express.js]: <http://expressjs.com>
   [socket.io]: <http://socket.io>
   [xterm.js]: <http://xtermjs.org>
   [node-pty]: <https://github.com/microsoft/node-pty>
   [dockerode]: <https://github.com/apocas/dockerode>
