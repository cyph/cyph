var BASE_URL			= 'https://api.cyph.com/';
var isHistoryAvailable	= typeof history != 'undefined';


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

var isFFMobile	=
	/fennec/.test(userAgent) ||
	(/firefox/.test(userAgent) && (isMobile || /mobile/.test(userAgent) || /tablet/.test(userAgent))
);
isMobile		= isMobile || isFFMobile;

var isTablet	= isMobile && window.outerWidth > 767;

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

$(function () {
	$('button > a').each(function () {
		var $this	= $(this);
		var $button	= $this.parent();

		$this.css('pointer-events', 'none');

		$button.click(function () {
			$this[0].click();
		});
	});
});
