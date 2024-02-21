# suso.ch
### _Interactive Cross-Platform WebApp_
#### CLI focused WebApp which temporarily spawns and attaches container terminals

Makes use of Express.js with Socket.io as WebApp Framework, node-pty along with xterm.js for terminals and dockerode to dynamically control docker containers.

## Tech
suso.ch makes use of the following tools & software:

- [Node.js] (JavaScript Runtime Environment)
- [Express.js] (Node.js Webserver Framework)
- [Socket.io] (Library for Realtime WebApps)
- [xterm.js] (JavaScript Frontend Terminal)
- [node-pty] (Fork pseudoterminals in Node.js)
- [dockerode] (Docker Remote API)


## Usage
Pull command:
```sh
~♥
```

Detach key sequence:
`CTRL+P + CTLR+Q `


Enter "`help`" into the console to get an overview of the available serverside CLI commands.

## Temporary Container
The default Dockerfile is ued to create containers with basic functionality:

| Function | Description |
| ------ | ------ |
| Cloudflared | Generates temporary URL |
| net-tools | Collection of networking utilities |
| cURL | CLI tool and library |
| htop | Interactive Task Manager |


## License

MIT

[//]: #
   [node.js]: <http://nodejs.org>
   [express.js]: <http://expressjs.com>
   [socket.io]: <http://socket.io>
   [xterm.js]: <http://socket.io>
   [node-pty]: <https://github.com/microsoft/node-pty>
   [dockerode]: <http://socket.io>
