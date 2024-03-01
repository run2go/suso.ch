# Use Alpine Linux as base image
FROM alpine:latest

# Define working directory
WORKDIR /usr/local/bin/

# Install packages
RUN apk --no-cache add openrc procps nano curl htop net-tools docker

# Download the latest tunnel.sh script & make it executable
RUN curl https://raw.githubusercontent.com/run2go/tunnel/main/tunnel.sh > /usr/local/bin/tunnel.sh
RUN chmod +x /usr/local/bin/tunnel.sh

# Copy the container scripts into the container
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY splash.sh /usr/local/bin/splash.sh

# Set execute permissions on the container scripts
RUN chmod +x /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/splash.sh

# Define shell
CMD ["/bin/sh"]

# Set the entrypoint of the container
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
