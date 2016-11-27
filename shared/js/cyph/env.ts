import {Config} from './config';
import {EnvDeploy} from './envdeploy';


/**
 * Dynamic values calculated at run-time.
 */
export class Env extends EnvDeploy {
	/** Current URL host (with www subdomain removed). */
	public static readonly host: string	= locationData.host.replace('www.', '');

	/** Complete (lowercase) language code, e.g. "en-us". */
	public static readonly fullLanguage: string	= (
		navigatorData.language ||
		(<any> navigatorData).userLanguage ||
		(<any> navigatorData).browserLanguage ||
		(<any> navigatorData).systemLanguage ||
		Config.defaultLanguage
	).toLowerCase();

	/** Normalised language code, used for translations. */
	public static readonly language: string		= (() => {
		const language: string	= Env.fullLanguage.split('-')[0];

		/* Consistency in special cases */
		return language === 'nb' ?
			'no' :
			language === 'zh-cn' ?
				'zh-chs' :
				language === 'zh-tw' ?
					'zh-cht' :
					language
		;
	})();

	/** Indicates whether this is (the main thread of) a Web environment. */
	public static readonly isWeb: boolean			= IS_WEB;

	/** Indicates whether this is the main thread. */
	public static readonly isMainThread: boolean	= typeof importScripts !== 'function';

	/** Indicates whether this is Node.js/io.js. */
	public static readonly isNode: boolean		=
		typeof (<any> self).process === 'object' &&
		typeof (<any> self).require === 'function'
	;

	/** Current user agent (lowercase). */
	public static readonly userAgent: string	= navigatorData.userAgent.toLowerCase();

	/** Indicates whether this is Edge. */
	public static readonly isEdge: boolean		= /edge\/\d+/.test(Env.userAgent);

	/** Indicates whether this is OS X. */
	public static readonly isOSX: boolean		= /mac os x/.test(Env.userAgent);

	/** Indicates whether this is Android. */
	public static readonly isAndroid: boolean	= /android/.test(Env.userAgent);

	/** Indicates whether this is iOS. */
	public static readonly isIOS: boolean		= /ipad|iphone|ipod/.test(Env.userAgent);

	/** Indicates whether this is iOS 8 or greater. */
	public static readonly isIOS8Plus: boolean	=
		Env.isIOS &&
		parseInt((Env.userAgent.match(/ os (\d+)_/) || [])[1], 10) >= 8
	;

	/** Indicates whether this is WebOS. */
	public static readonly isWebOS: boolean		= /webos/.test(Env.userAgent);

	/** Indicates whether this is BlackBerry. */
	public static readonly isBB: boolean		= /blackberry/.test(Env.userAgent);

	/** Indicates whether this is mobile Firefox. */
	public static readonly isFFMobile: boolean	=
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
	public static readonly isMobile: boolean	=
		Env.isAndroid ||
		Env.isIOS ||
		Env.isWebOS ||
		Env.isBB ||
		Env.isFFMobile
	;

	/** Indicates whether this should be considered a tablet. */
	public static readonly isTablet: boolean	= Env.isMobile && self.outerWidth > 767;

	/** Indicates whether this is a touchscreen environment. */
	public static readonly isTouch: boolean		= (() => {
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch (_) {
			return false;
		}
	})();

	/** Indicates whether this is the Cyph corporate website (cyph.com). */
	public static readonly isHomeSite: boolean	=
		Env.homeUrl.split('/')[2].replace('www.', '') === Env.host
	;

	/** Either "mobile" or "desktop", depending on Env.isMobile. */
	public static platformString: string		= Env.isMobile ? 'mobile' : 'desktop';

	/** Base URI for sending an SMS. */
	public static readonly smsUriBase: string	=
		'sms:' +
		(Env.isIOS8Plus ? '&' : Env.isIOS ? ';' : '?') +
		'body='
	;
}
