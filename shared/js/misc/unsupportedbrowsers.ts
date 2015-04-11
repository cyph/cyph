(function () {


let userAgent	= navigator.userAgent.toLowerCase();

let isFirefoxOS		= userAgent.match('firefox') && userAgent.match('mobile') && !userAgent.match('android');
let isOldIOS		= /ipad|iphone|ipod/.test(userAgent) && (parseInt((userAgent.match(/os (\d+)_(\d+)_?(\d+)?/) || [])[1], 10) || 0) < 7;
let isStockAndroid	= userAgent.match('android') && userAgent.match(/version\/\d\.\d/);

if (isFirefoxOS || isOldIOS || isStockAndroid) {
	location.pathname	= '/unsupportedbrowser';
}


}());
