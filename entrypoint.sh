#!/bin/bash

# Start docker service
service docker start

# Route all outgoing docker traffic through the wireguard interface, or not at all
iptables -A FORWARD -i wg0 -o docker0 -j ACCEPT
iptables -A FORWARD -i docker0 -o wg0 -j ACCEPT
iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT
iptables -P FORWARD DROP

# Start wireguard interface using the /etc/wireguard/wg.conf configuration file
wg-quick up /etc/wireguard/wg0.conf

# Start node.js main webapp
node /usr/src/app/server.js
