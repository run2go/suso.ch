#!/bin/sh

# Run splash.sh to replace & update motd
/usr/local/bin/splash.sh > /etc/motd

# Append a line break to motd
echo "" >> /etc/motd

# Start cloudflared service in the background
/usr/local/bin/cloudflared cloudflared tunnel --no-autoupdate --url http://localhost:80 &

# Wait for cloudflared to output the trycloudflare.com subdomain and append it to motd
while true; do
    # Get the process ID (PID) of the cloudflared process
    PID=$(pgrep -f "cloudflared tunnel --no-autoupdate --url http://localhost:80")
    if [ -n "$PID" ]; then
        # Extract the subdomain from the cloudflared command line arguments
        DOMAIN=$(cat /proc/$PID/cmdline | tr '\0' '\n' | grep -oh "https://\(.*\)trycloudflare.com")
        if [ -n "$DOMAIN" ]; then
            echo "Quick tunnel accessible via: $DOMAIN" >> /etc/motd
            break
        fi
    fi
    sleep 1
done

# Execute the commands passed to the container
exec "$@"
