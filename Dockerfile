# Use Alpine Linux as base image
FROM alpine:latest

# Install packages
RUN apk --no-cache add openrc sudo wireguard-tools wireguard-tools-wg-quick iptables docker npm nodejs

# Create app directory
RUN mkdir -p /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Define app directory
WORKDIR /usr/src/app/

# Copy the WireGuard configuration file
RUN cp /usr/src/app/config/wg.conf /etc/wireguard/wg0.conf

# Install app dependencies
RUN npm install

# Add services to rc-update
RUN rc-update add sysctl
RUN rc-update add docker
RUN rc-update add sysctl 
#RUN rc-update add wg

# Set the entrypoint of the container
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]