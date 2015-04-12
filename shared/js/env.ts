/// <reference path="config.ts" />
/// <reference path="globals.ts" />


class Env {
	public static isLocalhost: boolean	= location.hostname == 'localhost';
	public static isOnion: boolean		= location.host.split('.').slice(-1)[0] == 'onion';

	public static baseUrl: string	=
		Env.isLocalhost ?
			'http://localhost:8080/' :
			Env.isOnion ?
				'/api/' :
				Config.prodBaseUrl
	;

	public static host: string	= location.host.replace('www.', '');


	public static isWeb: boolean		= IS_WEB;
	public static isMainThread: boolean	= typeof importScripts !== 'function';

	public static isNode: boolean		=
		typeof self['process'] === 'object' &&
		typeof self['require'] === 'function'
	;


	public static userAgent: string		= navigator.userAgent.toLowerCase();

	public static isIE: boolean			= /msie |trident\//.test(Env.userAgent);
	public static isAndroid: boolean	= /android/.test(Env.userAgent);
	public static isIOS: boolean		= /ipad|iphone|ipod/.test(Env.userAgent);
	public static isWP: boolean			= /iemobile/.test(Env.userAgent);
	public static isWebOS: boolean		= /webos/.test(Env.userAgent);
	public static isBB: boolean			= /blackberry/.test(Env.userAgent);
	public static isOperaMini: boolean	= /opera mini/.test(Env.userAgent);

	public static isFFMobile: boolean	=
		/fennec/.test(Env.userAgent) ||
		(
			/firefox/.test(Env.userAgent) &&
			(
				Env.isAndroid ||
				/mobile/.test(Env.userAgent) ||
				/tablet/.test(Env.userAgent)
			)
		)
	;

	public static isMobile: boolean	=
		Env.isAndroid ||
		Env.isIOS ||
		Env.isWP ||
		Env.isWebOS ||
		Env.isBB ||
		Env.isOperaMini ||
		Env.isFFMobile
	;

	public static isTablet: boolean	= Env.isMobile && self.outerWidth > 767;

	public static isTouch: boolean	= (() => {
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch (_) {
			return false;
		}
	})();

	public static platformString: string	= Env.isMobile ? 'mobile' : 'desktop';


	public static isWebSignObsolete: boolean	= false;
	public static webSignHashes: string			= encodeURIComponent(
		'Hello Ryan and Josh,\n\n\n\n\n\n---\n\n' + (webSign ? webSign.toString() : '')
	);


	public static smsRecipient: string	= Env.isIOS ? '+1' : '';
}
