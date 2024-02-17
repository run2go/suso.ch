#!/bin/sh

# Run splash.sh to replace & update motd
/usr/local/bin/splash.sh > /etc/motd

# Append a line break to motd
echo "" >> /etc/motd

# Execute cloudflared and extract the domain, then append to motd
echo "Temporary URL to port 80: $(/usr/local/bin/cloudflared | grep -oh "https://\(.*\)trycloudflare.com")" >> /etc/motd

# Execute the commands passed to the container
exec "$@"
