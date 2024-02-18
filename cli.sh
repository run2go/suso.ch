#!/bin/bash
version=0.2
app="suso.ch"
address="https://suso.ch/"
debug=0
active="main"
menu=(main help login dl)
files=(file1.txt file2.zip file3.tar)

head_menu(){
    clear
    echo "$app CLI Interface"
    echo "- - - - - - - - - - -"
    echo
}
menu_main(){
    echo "Website Information:"
    echo "- Description: A simple CLI focused website with hidden functionality."
    echo "- Author: Run"
    echo "- Version: $version"
    echo "Use 'help' for a command overview."
    echo
}
menu_help(){
    echo "Commands:"
    echo "main ---- Access main menu"
    echo "help ---- Print this help screen"
    echo "login --- Authenticate your session"
    echo "dl ------ Open downloads page"
    echo "exit ---- Stop the shell script"
    echo
}
menu_login(){
    read -r -p "Enter the target: " target
    read -r -p "Enter your username: " user
    read -r -p "Enter your passcode to authenticate: " pass
    ssh "$user@$target" -P "$pass"
}
menu_dl(){
    file_pick="null"
    while [ "$file_pick" != 0 ]; do 
        head_menu
        echo "Downloads:"
        file_num=0 # Helper Variable
        for file in "${files[@]}"; do # Print contents of files array
            ((file_num++))
            echo "($file_num) $file - $address$file"
        done
        echo
        read -r -p "Choose from 1 to $file_num (use 0 to cancel): " file_pick
        if [[ "$file_pick" =~ ^[1-9]+$ && "$file_pick" -le "$file_num" ]]; then
            ((file_num--))
            head_menu
            curl "$address${files[$file_num]}"
            break
        fi
    done
}

head_menu # Start with title + main menu
menu_main 

while [ "$input" != "exit" ]; do # Main Loop
    read -r -p ">> " input
    head_menu

    for item in "${menu[@]}"; do # Update menupage if valid input
        if [ "$input" = "$item" ]; then
            active="$input";
        fi
    done

    case $active in # Change or refresh menu
        "main")  menu_main ;;
        "login") menu_login ;;
        "dl")    menu_dl ;;
        "help")  menu_help ;;
    esac

    case $input in # Handle other commands
        "debug") debug=$((debug == 1 ? 0 : 1)) ;;
        "0")     break ;;
    esac

    if [ "$debug" = 1 ]; then # Print additional info if in debug mode
        echo "Input: $input"
        echo "Active: $active"
    fi
done
