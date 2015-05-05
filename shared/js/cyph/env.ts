module Cyph {
	export class Env {
		public static isLocalEnv: boolean	= true;

		public static isOnion: boolean		= !!location && location.host.split('.').slice(-1)[0] === 'onion';

		public static baseUrl: string		= Env.isOnion ? '/api/' : `${location.protocol}//${location.hostname}:42000/`;
		public static homeUrl: string		= Env.isOnion ? '/' : `${location.protocol}//${location.hostname}:42001/`;
		public static newCyphUrl: string	= Env.isOnion ? '/im/' : `${location.protocol}//${location.hostname}:42002/`;
		public static cyphMeUrl: string		= Env.isOnion ? '/me/' : `${location.protocol}//${location.hostname}:42003/`;

		public static awsEndpoint: string	= `${location.protocol}//${location.hostname}:43000`;

		public static host: string			= location ? location.host.replace('www.', '') : '';

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


		public static isWeb: boolean		= IS_WEB;
		public static isMainThread: boolean	= typeof importScripts !== 'function';

		public static isNode: boolean		=
			typeof self['process'] === 'object' &&
			typeof self['require'] === 'function'
		;


		public static userAgent: string		= navigator ? navigator.userAgent.toLowerCase() : '';

		public static isIE: boolean			= /msie |trident\//.test(Env.userAgent);
		public static isOSX: boolean		= /mac os x/.test(Env.userAgent);
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

		public static smsRecipient: string	= Env.isIOS ? '+10000000000' : '';

		public static webSignWarningEmail: string		=
			'mailto:%22Ryan%20Lester%22%20%3Chacker@linux.com%3E,%20%22Baron%20Joshua%20Cyrus' +
			'%20Boehm%22%20%3Cjosh@joshboehm.com%3E?subject=I%20RECEIVED%20THE%20WALKEN%20WARNING&body=' +
			encodeURIComponent(
				'Hello Ryan and Josh,\n\n\n\n\n\n---\n\n' +
				(WebSign ? WebSign.toString() : '')
			)
		;
	}
}
