/**
 * @file Redirect browsers known not to work with Cyph.
 */

const userAgent = navigator.userAgent.toLowerCase();

const isIOS = /ipad|iphone|ipod/.test(userAgent);

const isFirefoxOS =
	/firefox/.test(userAgent) &&
	/mobile/.test(userAgent) &&
	!/android/.test(userAgent);

const isOldIOS =
	isIOS &&
	/* tslint:disable-next-line:ban */
	(parseInt((userAgent.match(/os (\d+)_(\d+)_?(\d+)?/) || [])[1], 10) || 0) <
		9;

const isOldSafari =
	!isIOS &&
	navigator.vendor === 'Apple Computer, Inc.' &&
	/* tslint:disable-next-line:ban */
	(parseInt((userAgent.match(/version\/(\d+)/) || [])[1], 10) || 0) < 9;

const isStockAndroid =
	/android/.test(userAgent) && /version\/\d\.\d/.test(userAgent);

const isOldOpera = /opera/.test(navigator.userAgent);

const isIE = /msie |trident\/|iemobile/.test(userAgent);

if (
	isFirefoxOS ||
	isOldIOS ||
	isOldSafari ||
	isStockAndroid ||
	isOldOpera ||
	isIE
) {
	location.pathname = '/unsupportedbrowser';
}
