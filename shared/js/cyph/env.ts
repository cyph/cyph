/// <reference path="envdeploy.ts" />


module Cyph {
	/**
	 * Dynamic values calculated at run-time.
	 */
	export class Env extends EnvDeploy {
		/** Current URL host (with www subdomain removed). */
		public static host: string	= location ? location.host.replace('www.', '') : '';

		/** Complete (lowercase) language code, e.g. "en-us". */
		public static fullLanguage: string	=
			Util.getValue(
				navigator,
				[
					'language',
					'userLanguage',
					'browserLanguage',
					'systemLanguage'
				],
				Config.defaultLanguage
			).
			toLowerCase()
		;

		/** Normalised language code, used for translations. */
		public static language: string		= (() => {
			const language: string	= Env.fullLanguage.split('-')[0];

			/* Consistency in special cases */
			return language === 'nb' ?
				'no' :
				language === 'zh-cn'?
					'zh-chs' :
					language === 'zh-tw' ?
						'zh-cht' :
						language
			;
		})();

		/** Indicates whether this is (the main thread of) a Web environment. */
		public static isWeb: boolean		= IS_WEB;

		/** Indicates whether this is the main thread. */
		public static isMainThread: boolean	= typeof importScripts !== 'function';

		/** Indicates whether this is Node.js/io.js. */
		public static isNode: boolean		=
			typeof self['process'] === 'object' &&
			typeof self['require'] === 'function'
		;

		/** Current user agent (lowercase). */
		public static userAgent: string		= navigator ? navigator.userAgent.toLowerCase() : '';

		/** Indicates whether this is Internet Explorer. */
		public static isIE: boolean			= /msie |trident\//.test(Env.userAgent);

		/** Indicates whether this is OS X. */
		public static isOSX: boolean		= /mac os x/.test(Env.userAgent);

		/** Indicates whether this is Android. */
		public static isAndroid: boolean	= /android/.test(Env.userAgent);

		/** Indicates whether this is iOS. */
		public static isIOS: boolean		= /ipad|iphone|ipod/.test(Env.userAgent);

		/** Indicates whether this is iOS 8. */
		public static isIOS8: boolean		= Env.isIOS && / os 8_/.test(Env.userAgent);

		/** Indicates whether this is Windows Phone. */
		public static isWP: boolean			= /iemobile/.test(Env.userAgent);

		/** Indicates whether this is WebOS. */
		public static isWebOS: boolean		= /webos/.test(Env.userAgent);

		/** Indicates whether this is BlackBerry. */
		public static isBB: boolean			= /blackberry/.test(Env.userAgent);

		/** Indicates whether this is Opera Mini. */
		public static isOperaMini: boolean	= /opera mini/.test(Env.userAgent);

		/** Indicates whether this is mobile Firefox. */
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

		/** Indicates whether this is mobile. */
		public static isMobile: boolean	=
			Env.isAndroid ||
			Env.isIOS ||
			Env.isWP ||
			Env.isWebOS ||
			Env.isBB ||
			Env.isOperaMini ||
			Env.isFFMobile
		;

		/** Indicates whether this should be considered a tablet. */
		public static isTablet: boolean	= Env.isMobile && self.outerWidth > 767;

		/** Indicates whether this is a touchscreen environment. */
		public static isTouch: boolean	= (() => {
			try {
				document.createEvent('TouchEvent');
				return true;
			}
			catch (_) {
				return false;
			}
		})();

		/** Either "mobile" or "desktop", depending on Env.isMobile. */
		public static platformString: string	= Env.isMobile ? 'mobile' : 'desktop';

		/** Base URI for sending an SMS. */
		public static smsUriBase: string	=
			'sms:' +
			(Env.isIOS8 ? '&' : Env.isIOS ? ';' : '?') +
			'body='
		;

		/** Default body text for mailto: link on WebSign warning screen. */
		public static webSignWarningEmail: string		=
			'mailto:%22Ryan%20Lester%22%20%3Chacker@linux.com%3E,%20' +
			'%22Baron%20Joshua%20Cyrus%20Boehm%22%20%3Cjosh@joshboehm.com%3E' +
			'?subject=I%20RECEIVED%20THE%20WALKEN%20WARNING&body=' +
			encodeURIComponent(
				'Hello Ryan and Josh,\n\n\n\n\n\n---\n\n' +
				(WebSign ? WebSign.toString() : '')
			)
		;
	}
}
