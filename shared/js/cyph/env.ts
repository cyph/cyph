import {config} from './config';
import {EnvDeploy} from './env-deploy';


/**
 * Dynamic values calculated at run-time.
 */
export class Env extends EnvDeploy {
	/** Current URL host (with www subdomain removed). */
	public readonly host: string	= locationData.host.replace('www.', '');

	/** Complete (lowercase) language code, e.g. "en-us". */
	public readonly fullLanguage: string	= (
		navigatorData.language ||
		(<any> navigatorData).userLanguage ||
		(<any> navigatorData).browserLanguage ||
		(<any> navigatorData).systemLanguage ||
		config.defaultLanguage
	).toLowerCase();

	/** Normalised language code, used for translations. */
	public readonly language: string		= (() => {
		const language: string	= this.fullLanguage.split('-')[0];

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

	/** Indicates whether this is a co-branded instance of Cyph. */
	public readonly coBranded: boolean		= !!customBuild;

	/** Indicates whether this is (the main thread of) a Web environment. */
	public readonly isWeb: boolean			= IS_WEB;

	/** Indicates whether this is the main thread. */
	public readonly isMainThread: boolean	= typeof (<any> self).importScripts !== 'function';

	/** Indicates whether this is Node.js/io.js. */
	public readonly isNode: boolean		=
		typeof (<any> self).process === 'object' &&
		typeof (<any> self).require === 'function'
	;

	/** Current user agent (lowercase). */
	public readonly userAgent: string	= navigatorData.userAgent.toLowerCase();

	/** Indicates whether this is Edge. */
	public readonly isEdge: boolean		= /edge\/\d+/.test(this.userAgent);

	/** Indicates whether this is macOS / OS X. */
	public readonly isMacOS: boolean	= /mac os x/.test(this.userAgent);

	/** Indicates whether this is Android. */
	public readonly isAndroid: boolean	= /android/.test(this.userAgent);

	/** Indicates whether this is iOS. */
	public readonly isIOS: boolean		= /ipad|iphone|ipod/.test(this.userAgent);

	/** Indicates whether this is iOS 8 or greater. */
	public readonly isIOS8Plus: boolean	=
		this.isIOS &&
		parseInt((this.userAgent.match(/ os (\d+)_/) || [])[1], 10) >= 8
	;

	/** Indicates whether this is WebOS. */
	public readonly isWebOS: boolean	= /webos/.test(this.userAgent);

	/** Indicates whether this is BlackBerry. */
	public readonly isBB: boolean		= /blackberry/.test(this.userAgent);

	/** Indicates whether this is mobile Firefox. */
	public readonly isFFMobile: boolean	=
		/fennec/.test(this.userAgent) ||
		(
			/firefox/.test(this.userAgent) &&
			(
				this.isAndroid ||
				/mobile/.test(this.userAgent) ||
				/tablet/.test(this.userAgent)
			)
		)
	;

	/** Indicates whether this is mobile. */
	public isMobile: boolean			=
		this.isAndroid ||
		this.isIOS ||
		this.isWebOS ||
		this.isBB ||
		this.isFFMobile
	;

	/** Indicates whether this should be considered a tablet. */
	public readonly isTablet: boolean	= this.isMobile && self.outerWidth > 767;

	/** Indicates whether this is a touchscreen environment. */
	public readonly isTouch: boolean	= (() => {
		/* TODO: HANDLE NATIVE */
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch (_) {
			return false;
		}
	})();

	/** Indicates whether this is the Cyph corporate website (cyph.com). */
	public readonly isHomeSite: boolean	=
		this.homeUrl.split('/')[2].replace('www.', '') === this.host
	;

	/** Base URI for sending an SMS. */
	public readonly smsUriBase: string	=
		'sms:' +
		(this.isIOS8Plus ? '&' : this.isIOS ? ';' : '?') +
		'body='
	;

	constructor () {
		super();
	}
}

/** @see Env */
export const env	= new Env();
