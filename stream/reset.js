// Restore logo
const logo = document.getElementById('logo');
logo.style.transition = 'transform 0.5s, width 0.5s, height 0.5s, opacity 0.5s';
logo.style.margin = 'auto';
logo.style.width = '30%';
logo.style.height = '30%';
logo.style.opacity = '100%';

// Remove div containers
var divs = document.querySelectorAll('div');
divs.forEach(function(div) {
    div.remove();
});
