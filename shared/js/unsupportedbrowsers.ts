(function () {


var userAgent	= navigator.userAgent.toLowerCase();

var isFirefoxOS		= userAgent.match('firefox') && userAgent.match('mobile') && !userAgent.match('android');
var isOldIOS		= /ipad|iphone|ipod/.test(userAgent) && (parseInt((userAgent.match(/os (\d+)_(\d+)_?(\d+)?/) || [])[1], 10) || 0) < 7;
var isStockAndroid	= userAgent.match('android') && userAgent.match(/version\/\d\.\d/);

if (isFirefoxOS || isOldIOS || isStockAndroid) {
	location.pathname	= '/unsupportedbrowser';
}


}());
