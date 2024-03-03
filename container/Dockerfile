# Use debian:bookworm-slim as the base image
FROM debian:bookworm-slim

# Install packages
RUN apt-get update && \
    apt-get install -y --fix-missing \
    curl nano wget net-tools procps htop iptables iproute2 openresolv systemd gpg && \
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

# Download the latest tunnel.sh script & make it executable
RUN curl -L https://raw.githubusercontent.com/run2go/tunnel/main/tunnel.sh > /usr/local/bin/tunnel.sh && \
    chmod +x+w /usr/local/bin/tunnel.sh

# Define global alias 
RUN echo 'alias tunnel="/usr/local/bin/tunnel.sh"' >> '/etc/bash.bashrc'

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
