# Use the latest Alpine Linux image
FROM alpine:latest

# Define the working directory
WORKDIR /usr/local/bin/

# Install packages
RUN apk --no-cache add openrc procps bash nano curl htop net-tools

# Download the latest tunnel.sh script & make it executable
RUN curl -L https://raw.githubusercontent.com/run2go/tunnel/main/tunnel.sh > /usr/local/bin/tunnel.sh && \
    chmod +x /usr/local/bin/tunnel.sh

# Define global alias 
#RUN echo 'alias tunnel="/usr/local/bin/tunnel.sh"' >> '/etc/bash.bashrc'
RUN echo 'alias tunnel="/usr/local/bin/tunnel.sh"' >> '/root/.profile'

# Copy file into the container image
COPY bashrc /root/bashrc
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY splash.sh /usr/local/bin/splash.sh

# Set execute permissions on the container scripts
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/splash.sh

# Set entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Define shell as default command
CMD ["/bin/bash"]
