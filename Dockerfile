# Use Alpine Linux as base image
FROM alpine:latest

# Install node, docker, wireguard-tools & install dockerode package for Node.js
RUN apk --no-cache add node docker wireguard-tools npm && npm install dockerode

# Copy the WireGuard configuration file
COPY wg.conf /etc/wireguard/

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app/

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# Expose port
EXPOSE 80

# Start the application
CMD ["node", "server.js"]
