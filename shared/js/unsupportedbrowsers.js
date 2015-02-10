(function () {


var userAgent	= navigator.userAgent.toLowerCase();

var isFirefoxOS		= userAgent.contains('firefox') && userAgent.contains('mobile') && !userAgent.contains('android');
var isOldIOS		= /ipad|iphone|ipod/.test(userAgent) && (parseInt((userAgent.match(/os (\d+)_(\d+)_?(\d+)?/) || [])[1], 10) || 0) < 7;
var isStockAndroid	= userAgent.contains('android') && userAgent.match(/version\/\d\.\d/) != null;

if (isFirefoxOS || isOldIOS || isStockAndroid) {
	document.location.pathname	= '/unsupportedbrowser';
}


}());
