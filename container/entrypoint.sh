#!/bin/bash

# Start docker service
service docker start

# Update MOTD using splash.sh
./usr/local/bin/splash.sh

# Start shell
exec "$@"
