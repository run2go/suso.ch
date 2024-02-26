#!/bin/sh

# Start wireguard interface using the /etc/wireguard/wg.conf configuration file
sudo wg-quick up /etc/wireguard/wg0.conf

# Enable IP forwarding
sudo touch /etc/sysctl.conf
sudo 'net.ipv4.ip_forward = 1' > /etc/sysctl.conf

# Start docker application
node /usr/src/app/server.js

# Route all outgoing docker traffic through the wireguard interface, or not at all
sudo iptables -A FORWARD -i wg0 -o docker0 -j ACCEPT
sudo iptables -A FORWARD -i docker0 -o wg0 -j ACCEPT
sudo iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT
sudo iptables -P FORWARD DROP

# Start node.js main webapp
node /usr/src/app/server.js
