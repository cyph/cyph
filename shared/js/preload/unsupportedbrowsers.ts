(() => {


let userAgent: string	= navigator.userAgent.toLowerCase();

let isFirefoxOS: boolean	=
	userAgent.match('firefox') &&
	userAgent.match('mobile') &&
	!userAgent.match('android')
;

let isOldIOS: boolean	=
	/ipad|iphone|ipod/.test(userAgent) &&
	(parseInt((userAgent.match(/os (\d+)_(\d+)_?(\d+)?/) || [])[1], 10) || 0) < 7
;

let isStockAndroid: boolean	=
	userAgent.match('android') &&
	!!userAgent.match(/version\/\d\.\d/)
;


if (isFirefoxOS || isOldIOS || isStockAndroid) {
	location.pathname	= '/unsupportedbrowser';
}


})();
