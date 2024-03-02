#!/bin/sh

# Define the path to the .bashrc file
bashrc_file="/root/.bashrc"

# Define the alias and append it to the .bashrc file
echo 'alias tunnel="/usr/local/bin/tunnel.sh"' >> "$bashrc_file"
source "$bashrc_file"

# Initialize tunnel and retrieve address & port
tunnel=$(tunnel)

# Run splash.sh with tunnel data
/usr/local/bin/splash.sh "$tunnel"
