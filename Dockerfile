# Use Alpine Linux as base image
FROM alpine:latest

# Install node, docker, wireguard-tools & install dockerode package for Node.js
RUN apk --no-cache add node docker wireguard-tools npm

# Copy the WireGuard configuration file
COPY ./config/wg.conf /etc/wireguard/

# Create app directory
RUN mkdir -p /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Define app directory
WORKDIR /usr/src/app/

# Install app dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
