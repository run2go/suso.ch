#!/bin/sh

# Initialize tunnel variables
tunnel_url="$1"
tunnel_port="$2"

## INFO
user="$(whoami)"
host="$(hostname)"
os='Alpine Linux'
kernel="$(uname -sr)"
docker="$(docker -v | awk '{gsub(/,/, "", $3); print $3}')"
shell="$(grep "^$(id -un):" /etc/passwd | awk -F: '{print $7}')"
address="$(curl --no-progress-meter ip.y1f.de 2>/dev/null)"
if [ -z "$address" ]; then
    address="none"
fi


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
ycb="${reset}${bold}${yellow}"   # bold yellow
mcb="${reset}${bold}${magenta}"  # bold magenta
bcb="${reset}${bold}${blue}"     # bold blue
bc="${reset}${blue}"             # blue
wc="${reset}${white}"            # white
rc="${reset}${red}"              # red

## OUTPUT
printf "
${bc}        /\\            ${bcb}${user}${reset}@${bcb}${host}${reset}
${bc}       /  \\           ${bcb}OS:        ${reset}${os}${reset}
${bc}      / /\\ \\  /\\      ${bcb}KERNEL:    ${reset}${kernel}${reset}
${bc}     / /  \\ \\/  \\     ${bcb}DOCKER:    ${mcb}${docker}${reset}
${bc}    / /    \\ \\/\\ \\    ${bcb}SHELL:     ${reset}${shell}${reset}
${bc}   / / /|   \\ \\ \\ \\   ${bcb}ADDRESS:   ${reset}${address}${reset}
${bc}  /_/ /_|    \\_\\ \\_\\  ${bcb}TUNNEL:    ${ycb}${tunnel_url}${reset} @ PORT ${wc}${tunnel_port}${reset}

${rc}> ${wc}Use ${ycb}'tunnel'${wc} to display the current tunnel URL.
${rc}> ${wc}Use ${ycb}'tunnel <PORT>'${wc} to generate a new tunnel to another port.

" >> /etc/motd