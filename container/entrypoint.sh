#!/bin/sh

# Assign $1 to tunnel_port if provided, otherwise use "80"
tunnel_port="${1:-80}"

# Define the log file path
log_file="/var/log/cloudflared.log"

# Remove the existing log file
rm -f "$log_file"

# Create an empty log file
touch "$log_file"

# Stop any running cloudflared processes
#pkill cloudflared

# Start cloudflared service in the background and redirect its output to a log file
/usr/local/bin/cloudflared tunnel --no-autoupdate --url "http://localhost:$tunnel_port" >> "$log_file" 2>&1 &

# Run splash.sh to replace /etc/motd and pass the log file path as an argument
/usr/local/bin/splash.sh "$log_file" "$tunnel_port" >> /etc/motd &

# Execute the commands passed to the container
exec /bin/ash
