#!/bin/bash

# Run docker requirements
containerd >/dev/null 2>&1 &
dockerd >/dev/null 2>&1 &

# Append an extra command to tunnel.sh, allowing tunnel.sh to run splash.sh
echo '/usr/local/bin/splash.sh "$tunnel"' >> '/usr/local/bin/tunnel.sh'

# Run "tunnel", have its output routed to /dev/null this once
tunnel >/dev/null 2>&1 &

# Start shell
exec "$@"
