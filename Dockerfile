# Use Debian bookworm-slim as base image
FROM debian:bookworm-slim

# Create app directory
RUN mkdir -p /usr/src/app

# Enable IP Forwarding
RUN echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf

# Define app directory
WORKDIR /usr/src/app/

# Bundle app source
COPY . /usr/src/app

# Copy the included WireGuard configuration file
RUN mkdir -p /etc/wireguard/
RUN cp /usr/src/app/config/wg.conf /etc/wireguard/wg0.conf

# Install packages
RUN apt-get update && \
    apt-get install -y --fix-missing \
    sudo iptables iproute2 openresolv systemd wireguard-tools npm nodejs python3 g++ make ca-certificates curl gpg nano && \
    rm -rf /var/lib/apt/lists/*

# Add Docker's official GPG key
RUN mkdir -m 0755 -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
RUN echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/*

# Adjust Docker specific ulimit
RUN \
    echo "ulimits: $(ulimit -Sn):$(ulimit -Hn)"; \
    sed -i 's/ulimit -Hn/# ulimit -Hn/g' /etc/init.d/docker; \
    service docker start; \
    rm -rf /var/cache/apt;

# Install app dependencies
RUN npm ci

# Ensure entrypoint is executable
RUN chmod +x /usr/src/app/entrypoint.sh

# Set the entrypoint of the container
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
