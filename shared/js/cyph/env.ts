import {Config} from './config';
import {EnvDeploy} from './envdeploy';


/**
 * Dynamic values calculated at run-time.
 */
export class Env extends EnvDeploy {
	/** Current URL host (with www subdomain removed). */
	public static host: string	= locationData.host.replace('www.', '');

	/** Complete (lowercase) language code, e.g. "en-us". */
	public static fullLanguage: string	= (
		navigatorData['language'] ||
		navigatorData['userLanguage'] ||
		navigatorData['browserLanguage'] ||
		navigatorData['systemLanguage'] ||
		Config.defaultLanguage
	).toLowerCase();

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
	public static userAgent: string		= navigatorData.userAgent.toLowerCase();

	/** Indicates whether this is Edge. */
	public static isEdge: boolean		= /edge\/\d+/.test(Env.userAgent);

	/** Indicates whether this is OS X. */
	public static isOSX: boolean		= /mac os x/.test(Env.userAgent);

	/** Indicates whether this is Android. */
	public static isAndroid: boolean	= /android/.test(Env.userAgent);

	/** Indicates whether this is iOS. */
	public static isIOS: boolean		= /ipad|iphone|ipod/.test(Env.userAgent);

	/** Indicates whether this is iOS 8 or greater. */
	public static isIOS8Plus: boolean	=
		Env.isIOS &&
		parseInt((Env.userAgent.match(/ os (\d+)_/) || [])[1], 10) >= 8
	;

	/** Indicates whether this is WebOS. */
	public static isWebOS: boolean		= /webos/.test(Env.userAgent);

	/** Indicates whether this is BlackBerry. */
	public static isBB: boolean			= /blackberry/.test(Env.userAgent);

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
	public static isMobile: boolean		=
		Env.isAndroid ||
		Env.isIOS ||
		Env.isWebOS ||
		Env.isBB ||
		Env.isFFMobile
	;

	/** Indicates whether this should be considered a tablet. */
	public static isTablet: boolean		= Env.isMobile && self.outerWidth > 767;

	/** Indicates whether this is a touchscreen environment. */
	public static isTouch: boolean		= (() => {
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch (_) {
			return false;
		}
	})();

	/** Indicates whether this is the Cyph corporate website (cyph.com). */
	public static isHomeSite: boolean		=
		Env.homeUrl.split('/')[2].replace('www.', '') === Env.host
	;

	/** Either "mobile" or "desktop", depending on Env.isMobile. */
	public static platformString: string	= Env.isMobile ? 'mobile' : 'desktop';

	/** Base URI for sending an SMS. */
	public static smsUriBase: string		=
		'sms:' +
		(Env.isIOS8Plus ? '&' : Env.isIOS ? ';' : '?') +
		'body='
	;

	private static _	= (() => {
		if (!customBuild) {
			return;
		}

		Env.newCyphBaseUrl		= `https://${customBuild}/`;
		Env.newCyphUrl			= Env.newCyphBaseUrl;
		Env.cyphMeBaseUrl		= `${Env.newCyphBaseUrl}#me/`;
		Env.cyphMeUrl			= Env.cyphMeBaseUrl;
		Env.cyphIoBaseUrl		= `${Env.newCyphBaseUrl}#io/`;
		Env.cyphIoUrl			= Env.cyphIoBaseUrl;
		Env.cyphVideoBaseUrl	= `${Env.newCyphBaseUrl}#video/`;
		Env.cyphVideoUrl		= Env.cyphVideoBaseUrl;
		Env.cyphAudioBaseUrl	= `${Env.newCyphBaseUrl}#audio/`;
		Env.cyphAudioUrl		= Env.cyphAudioBaseUrl;
	})();
}
