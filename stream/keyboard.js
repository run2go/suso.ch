// If mobile device
if(window.matchMedia("(pointer: coarse)").matches) {
    // Make cmd input timout last 3s - allowing for slower input
    timeout = 3000;
    
    // Create a text input element
    var input = document.createElement('input');
    input.type = 'text';
    
    // Append the input field to the body
    document.body.appendChild(input);
    
    // Focus on the input field
    input.focus();
    
    // Wait for a brief moment to allow the keyboard to appear
    setTimeout(function() {
        document.body.removeChild(input); // Remove the input field
    }, 1000); // Remove the element after 1s  
}