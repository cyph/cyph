var BASE_URL						= 'https://api.cyph.com/';
var isHistoryAvailable				= typeof history != 'undefined';


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
	return document.location.pathname.split('/').slice(-1)[0];
}


/*
	Note: not using the previous exhaustive/correct valid URL pattern because
	it spikes the CPU to 100% with the string 'aoeuidhtns-aoeuhtns-aoeuidhtns-aoeuidhtns-'
*/

var urlInvalidStarts	= {'!': true, '[': true};
var urlProtocolPattern	= /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
var urlExtensionPattern	= /.*(\.co|\.im|\.me|\.org|\.net|\.io|\.ly|\.edu|\.gov|\.de|\.mil|\.in|\.fm|\.am|\.xxx).*/;

function isValidUrl(s) {
	return s.length < 5000 && !urlInvalidStarts[s[0]] && (urlProtocolPattern.test(s) || urlExtensionPattern.test(s));
}


function pushNotFound () {
	pushState('/404');
}


function pushState (path, shouldReplace) {
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

	processUrlState();
}




var userAgent	= navigator.userAgent.toLowerCase();

var isAndroid	= /android/.test(userAgent);
var isIOS		= /ipad|iphone|ipod/.test(userAgent);
var isWP		= /iemobile/.test(userAgent);
var isWebOS		= /webos/.test(userAgent);
var isBB		= /blackberry/.test(userAgent);
var isOperaMini	= /opera mini/.test(userAgent);

var isMobile	= isAndroid || isIOS || isWP || isWebOS || isBB || isOperaMini || (function () {
	try {
		document.createEvent('TouchEvent');
		return true;
	}
	catch (e) {
		return false;
	}
}());

var platformString	= isMobile ? 'mobile' : 'desktop';

$.fn.tap	= function (callback, onOrOff, once) {
	var $this		= $(this);
	var eventName	= isMobile ? 'touchstart' : 'click';

	if (!callback) {
		$this.trigger(eventName);
	}
	else if (onOrOff === false) {
		$this.off(eventName, callback);
	}
	else if (once === true) {
		$this.one(eventName, callback);
	}
	else {
		$this.on(eventName, callback);
	}

	return $this;
}

$('.' + platformString + '-only [deferred-src], [deferred-src].' + platformString + '-only').
	each(function () {
		var $this	= $(this);
		$this.attr('src', $this.attr('deferred-src'));
	})
;

$('[onenterpress]').each(function () {
	var $this			= $(this);
	var enterpressOnly	= $this.attr('enterpress-only');

	if (!enterpressOnly || enterpressOnly == platformString) {
		$this.keypress(function (e) {
			if (e.keyCode == 13 && !e.shiftKey) {
				var onenterpress	= $this.attr('onenterpress');

				if (onenterpress) {
					eval(onenterpress);
					e.preventDefault();
				}
			}
		});
	}
});
