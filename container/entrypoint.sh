#!/bin/sh

# Define the path to the .bashrc file
bashrc_file="/root/.bashrc"

# Define the alias and append it to the .bashrc file
echo 'alias tunnel="/usr/local/bin/tunnel.sh"' > "$bashrc_file"

# Initialize tunnel and retrieve address & port
tunnel_output=$(/usr/local/bin/tunnel.sh init)
tunnel_address=$(echo "$tunnel_output" | cut -d' ' -f1)
tunnel_port=$(echo "$tunnel_output" | cut -d' ' -f2)

# Start docker instance
service docker start

# Run splash.sh with tunnel data
/usr/local/bin/splash.sh "$tunnel_address" "$tunnel_port"
