var anal			= document.createElement('iframe');
anal.style.display	= 'none';
anal.src			= BASE_URL + 'analytics/' + document.location.toString().split('://').slice(-1)[0].split('www.').slice(-1)[0].split('#')[0];

document.body.appendChild(anal);

setTimeout(function () {
	anal.parentNode.removeChild(anal);
}, 10000);
