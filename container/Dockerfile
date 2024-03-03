# Use debian:bookworm-slim as the base image
FROM debian:bookworm-slim

# Install packages
RUN apt-get update && \
    apt-get install -y curl docker.io nano wget net-tools procps htop iptables iproute2 openresolv systemd git neofetch && \
    rm -rf /var/lib/apt/lists/*

# Download the latest tunnel.sh script & make it executable
RUN curl -L https://raw.githubusercontent.com/run2go/tunnel/main/tunnel.sh > /usr/local/bin/tunnel.sh && \
    chmod +x+w /usr/local/bin/tunnel.sh

# Define global alias 
RUN echo 'alias tunnel="/usr/local/bin/tunnel.sh"' >> '/etc/profile.d/00-aliases.sh'

# Copy the container scripts into the container
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY splash.sh /usr/local/bin/splash.sh

# Set execute permissions on the container scripts
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/splash.sh

# Set entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Define shell as default command
CMD ["/bin/bash"]
