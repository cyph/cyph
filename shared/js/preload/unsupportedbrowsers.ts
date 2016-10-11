/**
 * @file Redirect browsers known not to work with Cyph.
 */


(() => {


const userAgent: string	= navigator.userAgent.toLowerCase();

const isFirefoxOS: boolean		=
	userAgent.match('firefox') &&
	userAgent.match('mobile') &&
	!userAgent.match('android')
;

const isOldIOS: boolean			=
	/ipad|iphone|ipod/.test(userAgent) &&
	(parseInt((userAgent.match(/os (\d+)_(\d+)_?(\d+)?/) || [])[1], 10) || 0) < 7
;

const isStockAndroid: boolean	=
	userAgent.match('android') &&
	!!userAgent.match(/version\/\d\.\d/)
;

const isOldOpera: boolean		= /opera/.test(navigator.userAgent);

const isIE: boolean				= /msie |trident\/|iemobile/.test(userAgent);


if (
	isFirefoxOS ||
	isOldIOS ||
	isStockAndroid ||
	isOldOpera ||
	isIE
) {
	location.pathname	= '/unsupportedbrowser';
}


})();
