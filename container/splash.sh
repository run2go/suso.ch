#!/bin/sh

# Define function to update MOTD with tunnel information
update_motd() {
    ## INFO
    user="$(whoami)"
    host="$(hostname)"
    os='Alpine Linux'
    kernel="$(uname -sr)"
    docker="$(docker -v | awk '{gsub(/,/, "", $3); print $3}')"
    shell="$(grep "^$(id -un):" /etc/passwd | awk -F: '{print $7}')"
    address="$(curl -L ip.y1f.de)"

    ## DEFINE COLORS
    bold='\033[1m'
    black='\033[0;30m'
    red='\033[0;31m'
    green='\033[0;32m'
    yellow='\033[0;33m'
    blue='\033[0;34m'
    magenta='\033[0;35m'
    cyan='\033[0;36m'
    white='\033[0;37m'
    reset='\033[0m'

    ## COMBINED STYLE

    ycb="${reset}${bold}${yellow}"       # bold yellow
    mcb="${reset}${bold}${magenta}"      # bold magenta
    bcb="${reset}${bold}${blue}"         # bold blue
    bc="${reset}${blue}"                 # blue
    wc="${reset}${white}"                # white
    rc="${reset}${white}"                # red

    ## CLEAR SCREEN
    clear

    ## OUTPUT
printf "
${bc}        /\\            ${bcb}${user}${reset}@${bcb}${host}${reset}
${bc}       /  \\           ${bcb}OS:        ${reset}${os}${reset}
${bc}      / /\\ \\  /\\      ${bcb}KERNEL:    ${reset}${kernel}${reset}
${bc}     / /  \\ \\/  \\     ${bcb}DOCKER:    ${mcb}${docker}${reset}
${bc}    / /    \\ \\/\\ \\    ${bcb}SHELL:     ${reset}${shell}${reset}
${bc}   / / /|   \\ \\ \\ \\   ${bcb}ADDRESS:   ${reset}${address}${reset}
${bc}  /_/ /_|    \\_\\ \\_\\  ${bcb}TUNNEL:    ${ycb}${tunnel_url}${reset} @ Port ]${wc}${tunnel_port}${reset}]
${rc}> Use 'tunnel <PORT>' to generate a new Tunnel leading to another port.

"
}

# Get the log file path and tunnel port from the command line arguments
log_file="$1"
tunnel_port="$2"

# Initialize tunnel URL variable
tunnel_url=""

# Loop until tunnel information is extracted
while [ -z "$tunnel_url" ]; do
    # Read the log file line by line
    while IFS= read -r line; do
        # Extract tunnel information from the line
        tunnel_url=$(echo "$line" | grep -o "https://.*trycloudflare.com")
        # If tunnel URL is found, break out of the loop
        [ -n "$tunnel_url" ] && break
    done < "$log_file"
    
    # Wait for 1 second before checking again
    sleep 1
done

# Update MOTD with tunnel information
update_motd "$tunnel_url" "$tunnel_port"
