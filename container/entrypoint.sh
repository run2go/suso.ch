#!/bin/sh

# Run splash.sh to update motd
/usr/local/bin/splash.sh > /etc/motd

# Execute the commands passed to the container
exec "$@"
