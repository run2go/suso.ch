#!/bin/sh

# Start wireguard interface using the /etc/wireguard/wg.conf configuration file
sudo wg-quick up /etc/wireguard/wg0.conf

# Route all outgoing docker traffic through the wireguard interface, or not at all
sudo iptables -A FORWARD -i wg0 -o docker0 -j ACCEPT
sudo iptables -A FORWARD -i docker0 -o wg0 -j ACCEPT
sudo iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT
sudo iptables -P FORWARD DROP

# Start "node server.js" main webapp
#node /usr/src/app/server.js

touch /etc/sysctl.conf
'net.ipv4.ip_forward = 1' > /etc/sysctl.conf
'net.ipv6.conf.all.disable_ipv6 = 0' > /etc/sysctl.conf
'net.ipv6.conf.default.disable_ipv6 = 0' > /etc/sysctl.conf
'net.ipv6.conf.lo.disable_ipv6 = 0' > /etc/sysctl.conf