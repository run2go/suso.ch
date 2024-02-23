# Use Alpine Linux as base image
FROM alpine:latest

# Clear the motd and issue files
RUN echo "" > /etc/motd && echo "" > /etc/issue

# Install packages
RUN apk --no-cache add openrc procps nano curl htop net-tools docker

# Download the latest cloudflared binary & set execution permissions
RUN wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
RUN chmod +x /usr/local/bin/cloudflared

# Copy the entrypoint.sh & splash.sh script into the container
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY splash.sh /usr/local/bin/splash.sh

# Set execute permissions on the entrypoint.sh & splash.sh script
RUN chmod +x /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/splash.sh

# Define shell
CMD ["/bin/ash"]

# Set the entrypoint of the container
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
