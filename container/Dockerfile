# Use Alpine Linux as base image
FROM alpine:latest

# Clear the motd and issue files
RUN echo "" > /etc/motd && echo "" > /etc/issue

# Install packages
RUN apk --no-cache add docker net-tools curl

# Download the latest cloudflared binary
RUN wget -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared

# Download the ufetch-alpine script and save it as splash.sh
RUN wget -O /usr/local/bin/splash.sh https://gitlab.com/jschx/ufetch/-/raw/main/ufetch-alpine

# Set execute permissions on the splash.sh script
RUN chmod +x /usr/local/bin/splash.sh

# Copy the entrypoint script into the container
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Set execute permissions on the entrypoint script
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set the entrypoint of the container
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
