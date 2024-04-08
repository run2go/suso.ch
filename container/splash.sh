#!/bin/sh

## INFO
user="$(whoami)"
host="$(hostname)"
os="$(grep '^PRETTY_NAME' /etc/os-release | cut -d'=' -f2 | tr -d '"')"
kernel="$(uname -sr)"

memory_current=$(cat /sys/fs/cgroup/memory.current)
memory_max=$(cat /sys/fs/cgroup/memory.max)
memory_usage_mb=$(echo "$memory_current" | awk '{printf "%.0f", $1/1048576}')
memory_limit_mb=$(echo "$memory_max" | awk '{printf "%.0f", $1/1048576}')
memory_percentage=$(echo "$memory_current $memory_max" | awk '{printf "%.2f", ($1/$2)*100}')
memory="$(echo "$memory_usage_mb/$memory_limit_mb""MB ($memory_percentage%)")"

shell="$(grep "^$(id -un):" /etc/passwd | awk -F: '{print $7}')"
tunnel="$(/usr/local/bin/tunnel.sh)"
address="$(curl --no-progress-meter ip.y1f.de 2>/dev/null)"
if [ -z "$address" ]; then
    address="localhost"
fi

## DEFINE COLORS
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;93m'
blue='\033[0;34m'
cyan='\033[0;36m'
white='\033[0;37m'
ul_link='\033[4;36m'
reset='\033[0m'

## COMBINED STYLE
yc="${reset}${yellow}"
cc="${reset}${cyan}"
bc="${reset}${blue}"
wc="${reset}${white}"
rc="${reset}${red}"
gc="${reset}${green}"
tun="${reset}${ul_link}"

## OUTPUT
printf "
${bc}        /\\                     ${yc}%s${reset}@${yc}%s
${bc}       /  \\           ${cc}OS:      ${reset}${gc}%s
${bc}      / /\\ \\  /\\      ${cc}KERNEL:  ${reset}%s
${bc}     / /  \\ \\/  \\     ${cc}MEMORY:  ${reset}%s
${bc}    / /    \\ \\/\\ \\    ${cc}SHELL:   ${reset}${gc}%s
${bc}   / / /|   \\ \\ \\ \\   ${cc}ADDRESS: ${reset}%s
${bc}  /_/ /_|    \\_\\ \\_\\  ${cc}TUNNEL:  ${tun}%s

${rc}> ${wc}Use ${yc}'tunnel'${wc} to display the current tunnel URL.
${rc}> ${wc}Use ${yc}'tunnel <PORT/ADDRESS>'${wc} to generate a new tunnel to another port.

" "$user" "$host" "$os" "$kernel" "$memory" "$shell" "$address" "$tunnel" > /etc/motd
