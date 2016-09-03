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

const isIE: boolean				= /msie |trident\//.test(userAgent);
const isEdge: boolean			= /edge\/\d+/.test(userAgent);
const isWindowsPhone: boolean	= /iemobile/.test(userAgent);


if (
	isFirefoxOS ||
	isOldIOS ||
	isStockAndroid ||
	isIE ||
	isEdge ||
	isWindowsPhone
) {
	location.pathname	= '/unsupportedbrowser';
}


})();
