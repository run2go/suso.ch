#!/bin/bash

source ~/bashrc

# Update MOTD using splash.sh
/usr/local/bin/splash.sh

# Start shell
exec "$@"
