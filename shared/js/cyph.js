var isLocalhost			= document.location.hostname == 'localhost';
var isOnion				= document.location.host.split('.').slice(-1)[0] == 'onion';

var BASE_URL			= isLocalhost ? 'http://localhost:8080/' : isOnion ? '/api/' : 'https://api.cyph.com/';
var ONION_URL			= 'https://cyphdbyhiddenbhs.onion';
var isHistoryAvailable	= typeof history != 'undefined';



/* Redirect to Onion site when on Tor */

if (!isLocalhost && !isOnion) {
	var theRest	= document.location.toString().split(document.location.host)[1];

	$.get(ONION_URL + '/ping', function (data) {
		if (data == 'pong') {
			var path	= '';
			switch (document.location.hostname) {
				case 'www.cyph.im':
					path	= '/im';
					break;

				case 'www.cyph.me':
					path	= '/me';
					break;
			}

			document.location.href	= ONION_URL + path + theRest;
		}
	});
}



function errorLog (subject, shouldIncludeBootstrapText) {
	return function () {
		var exception	= JSON.stringify(arguments);

		var message		= exception +
			'\n\n' + navigator.userAgent +
			'\n\n' + navigator.language +
			'\n\n' + (typeof language == 'undefined' ? '' : language) +
			'\n\n' + document.location.toString() +
			'\n\n' + (
				typeof webSign == 'undefined' ?
					'' :
					webSign.toString(shouldIncludeBootstrapText)
			)
		;

		$.ajax({
			type: 'POST',
			url: 'https://mandrillapp.com/api/1.0/messages/send.json',
			data: {
				key: 'HNz4JExN1MtpKz8uP2RD1Q',
				message: {
					from_email: 'test@mandrillapp.com',
					to: [{
						email: 'errors@cyph.com',
						type: 'to'
					}],
					autotext: 'true',
					subject: 'CYPH: ' + subject,
					text: message
				}
			}
		});

		/* makeAwsRequest({
			action: 'SendEmail',
			url: 'https://email.us-east-1.amazonaws.com',
			service: 'ses',
			params: {
				'Destination.ToAddresses.member.1': 'errors@cyph.com',
				'Message.Body.Text.Data': message,
				'Message.Subject.Data': 'CYPH: ' + subject,
				'Source': 'test@amazonses.heisenberg.co'
			}
		}); */

		anal.send('exception', {
			exDescription: exception
		});
	};
}

window.onerror		= errorLog('WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS');
window.smpError		= errorLog('SMP JUST FAILED FOR SOMEONE LADS');
window.webSignError	= errorLog('SOMEONE JUST GOT THE WEBSIGN ERROR SCREEN LADS', true);



function getString (name) {
	return $('meta[name="' + name + '"]').attr('content');
}


function getTimestamp () {
	var date	= new Date();
	var hour	= date.getHours();
	var ampm	= 'am';
	var minute	= ('0' + date.getMinutes()).slice(-2);

	if (hour >= 12) {
		hour	-= 12;
		ampm	= 'pm';
	}
	if (hour == 0) {
		hour	= 12;
	}

	return hour + ':' + minute + ampm;
}


function getUrlState () {
	var split	= document.location.pathname.split('/');

	var a	= split.slice(-1)[0];
	var b	= split.slice(-2)[0];

	if (!a && b) {
		return b;
	}
	else {
		return a;
	}
}


function pushNotFound () {
	pushState('/404');
}


function pushState (path, shouldReplace, shouldNotProcess) {
	if (shouldReplace && isHistoryAvailable && history.replaceState) {
		history.replaceState({}, '', path);
	}
	else if (isHistoryAvailable && history.pushState) {
		history.pushState({}, '', path);
	}
	else if (shouldReplace) {
		document.location.replace(path);
		return;
	}
	else {
		document.location.pathname	= path;
		return;
	}

	if (!shouldNotProcess) {
		processUrlState();
	}
}




var userAgent	= navigator.userAgent.toLowerCase();

var isTouch		= (function () {
	try {
		document.createEvent('TouchEvent');
		return true;
	}
	catch (e) {
		return false;
	}
}());

var isIE		= /msie |trident\//.test(userAgent);

var isAndroid	= /android/.test(userAgent);
var isIOS		= /ipad|iphone|ipod/.test(userAgent);
var isWP		= /iemobile/.test(userAgent);
var isWebOS		= /webos/.test(userAgent);
var isBB		= /blackberry/.test(userAgent);
var isOperaMini	= /opera mini/.test(userAgent);

var isMobile	= isAndroid || isIOS || isWP || isWebOS || isBB || isOperaMini;

var isFFMobile	=
	/fennec/.test(userAgent) ||
	(/firefox/.test(userAgent) && (isMobile || /mobile/.test(userAgent) || /tablet/.test(userAgent))
);
isMobile		= isMobile || isFFMobile;

var isTablet	= isMobile && window.outerWidth > 767;

var platformString	= isMobile ? 'mobile' : 'desktop';

$(function () {
	$('.' + platformString + '-only [deferred-src], [deferred-src].' + platformString + '-only').
		each(function () {
			var $this	= $(this);
			$this.attr('src', $this.attr('deferred-src'));
		})
	;

	$('[on-enterpress]').each(function () {
		var $this			= $(this);
		var enterpressOnly	= $this.attr('enterpress-only');

		if (!enterpressOnly || enterpressOnly == platformString) {
			var onenterpress	= $this.attr('on-enterpress');

			$this.keypress(function (e) {
				if (e.keyCode == 13 && !e.shiftKey) {
					if (onenterpress) {
						eval(onenterpress);
						e.preventDefault();
					}
				}
			});
		}
	});

	['click', 'change'].forEach(function (eventName) {
		var attribute	= 'on-' + eventName;

		$('[' + attribute + ']').each(function () {
			var $this	= $(this);

			$this.on(eventName, function () {
				eval($this.attr(attribute));
			});
		});
	});

	$('button > a').each(function () {
		var $this	= $(this);
		var $button	= $this.parent();

		$this.css('pointer-events', 'none');

		$button.click(function () {
			$this[0].click();
		});
	});
});


/* Trigger event loops from Web Worker instead of setTimeout (http://stackoverflow.com/a/12522580/459881) */
var tickFunctions	= [];

function makeWorker (f, vars) {
	var s	= f.toString();
	s		= s.slice(s.indexOf('{') + 1, s.lastIndexOf('}'));

	if (vars) {
		s	= s.replace(new RegExp('this.vars', 'g'), JSON.stringify(vars));
	}

	var blob, worker;

	try {
		blob	= new Blob([s], {type: 'application/javascript'});
	}
	catch (e) {
		window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
		blob	= new BlobBuilder();
		blob.append(s);
		blob	= blob.getBlob();
	}

	try {
		worker	= new Worker(URL.createObjectURL(blob));
	}
	catch (e) {
		worker	= new Worker('websign/js/workerHelper.js');
		worker.postMessage(s);
	}

	return worker;
}

function onTick (f) {
	tickFunctions.push(f);

	if (tickFunctions.length == 1) {
		var worker, processTicksLock;

		function processTicks () {
			if (!processTicksLock) {
				processTicksLock	= true;

				var now	= Date.now();

				try {
					for (var i = 0 ; i < tickFunctions.length ; ++i) {
						var f	= tickFunctions[i];
						f && f(now);
					}
				}
				finally {
					processTicksLock	= false;
				}
			}
		}

		function processTickEventLoop (interval) {
			processTicks();
			setTimeout(processTickEventLoop, interval);
		}

		function processTickWorker (interval) {
			worker	= makeWorker(function () {
				var vars	= this.vars;

				setInterval(function () {
					postMessage({eventName: 'tick'});
				}, vars.interval);
			}, {
				interval: interval
			});

			worker.onmessage	= processTicks;
		}


		if (isMobile) {
			processTickEventLoop(25);
			setTimeout(function () { processTickWorker(500) }, 2500);
		}
		else {
			processTickWorker(50);
		}
	}

	return tickFunctions.length - 1;
}

function tickOff (id) {
	delete tickFunctions[id];
}


/* jQuery plugin to get element bounds */
$.fn.bounds	= function () {
	var $this	= $(this);
	var bounds	= $this.offset();

	bounds.bottom	= bounds.top + $this.outerHeight();
	bounds.right	= bounds.left + $this.outerWidth();

	return bounds;
};
