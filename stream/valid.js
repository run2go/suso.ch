const logo = document.querySelector('#logo');
logo.style.position = 'relative';
logo.style.top = '0';
logo.style.left = '0';
logo.style.width = '30%';
logo.style.height = '30%';
logo.style.opacity = '100%';
logo.style.filter = 'drop-shadow(0 0 8px #fff)';
setTimeout(() => { logo.style.filter = 'none'; }, 200);