/**
 * @file Redirect browsers known not to work with Cyph.
 */


const userAgent: string	= navigator.userAgent.toLowerCase();

const isFirefoxOS: boolean		=
	/firefox/.test(userAgent) &&
	/mobile/.test(userAgent) &&
	!/android/.test(userAgent)
;

const isOldIOS: boolean			=
	/ipad|iphone|ipod/.test(userAgent) &&
	(parseInt((userAgent.match(/os (\d+)_(\d+)_?(\d+)?/) || [])[1], 10) || 0) < 9
;

const isOldSafari: boolean			=
	navigator.vendor === 'Apple Computer, Inc.' &&
	(parseInt((userAgent.match(/version\/(\d+)/) || [])[1], 10) || 0) < 9
;

const isStockAndroid: boolean	=
	/android/.test(userAgent) &&
	/version\/\d\.\d/.test(userAgent)
;

const isOldOpera: boolean		= /opera/.test(navigator.userAgent);

const isIE: boolean				= /msie |trident\/|iemobile/.test(userAgent);


if (
	isFirefoxOS ||
	isOldIOS ||
	isOldSafari ||
	isStockAndroid ||
	isOldOpera ||
	isIE
) {
	location.pathname	= '/unsupportedbrowser';
}
