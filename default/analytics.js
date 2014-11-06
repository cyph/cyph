var anal			= document.createElement('iframe');
anal.style.display	= 'none';
anal.src			= '//api.cyph.com/analytics/' + document.location.toString().split('://').slice(-1)[0].split('www.').slice(-1)[0];

document.body.appendChild(anal);

setTimeout(function () {
	anal.remove();
}, 10000);
