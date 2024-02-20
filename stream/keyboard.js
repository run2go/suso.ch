// If mobile device
if(window.matchMedia("(pointer: coarse)").matches) {
    if (!document.getElementById('keyboard')) {
        // Create a text input element
        var input = document.createElement('input');
        input.id = 'keyboard';
        input.style.borderStyle = 'none';
        input.style.position = 'fixed';
        input.style.width = '0';
        input.style.height = '0';
        input.style.zIndex = '-1';
        input.type = 'search';
        
        // Append the input field to the body
        document.body.appendChild(input);

        document.createTextNode('input::selection { background: transparent; background-color: transparent; }'); //input::-moz-selection
    }
    // Focus on the input field
    document.getElementById('keyboard').focus();
}