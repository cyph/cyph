import {config} from './config';
import {EnvDeploy} from './env-deploy';


/**
 * Dynamic values calculated at run-time.
 */
export class Env extends EnvDeploy {
	/** @ignore */
	private static readonly UA: string		= navigatorData.userAgent.toLowerCase();

	/** Indicates whether this is a co-branded instance of Cyph. */
	public readonly coBranded: boolean		= !!customBuild;

	/** Firebase-related config. */
	public readonly firebaseConfig			= {
		apiKey: 'AIzaSyB7B8i8AQPtgMXS9o6zbfX1Vv-PwW2Q0Jo',
		authDomain: 'cyphme.firebaseapp.com',
		databaseURL: this.firebaseEndpoint,
		storageBucket: 'cyphme.appspot.com'
	};

	/** Complete (lowercase) language code, e.g. "en-us". */
	public readonly fullLanguage: string	= (
		navigatorData.language ||
		(<any> navigatorData).userLanguage ||
		(<any> navigatorData).browserLanguage ||
		(<any> navigatorData).systemLanguage ||
		config.defaultLanguage
	).toLowerCase();

	/** Current URL host (with www subdomain removed). */
	public readonly host: string			= locationData.host.replace('www.', '');

	/** Indicates whether this is Android. */
	public readonly isAndroid: boolean		= /android/.test(Env.UA);

	/** Indicates whether this is Edge. */
	public readonly isEdge: boolean			= /edge\/\d+/.test(Env.UA);

	/** Indicates whether this is mobile Firefox. */
	public readonly isFFMobile: boolean		=
		/fennec/.test(Env.UA) ||
		(
			/firefox/.test(Env.UA) &&
			(
				this.isAndroid ||
				/mobile/.test(Env.UA) ||
				/tablet/.test(Env.UA)
			)
		)
	;

	/** Indicates whether this is the Cyph corporate website (cyph.com). */
	public readonly isHomeSite: boolean	=
		this.homeUrl.split('/')[2].replace('www.', '') === this.host
	;

	/** Indicates whether this is iOS. */
	public readonly isIOS: boolean			= /ipad|iphone|ipod/.test(Env.UA);

	/** Indicates whether this is iOS 8 or greater. */
	public readonly isIOS8Plus: boolean		=
		this.isIOS &&
		parseInt((Env.UA.match(/ os (\d+)_/) || [])[1], 10) >= 8
	;

	/** Indicates whether this is macOS / OS X. */
	public readonly isMacOS: boolean		= /mac os x/.test(Env.UA);

	/** Indicates whether this is the main thread. */
	public readonly isMainThread: boolean	= typeof (<any> self).importScripts !== 'function';

	/** Indicates whether this is mobile. */
	public readonly isMobile: boolean		=
		this.isAndroid ||
		this.isIOS ||
		this.isFFMobile
	;

	/** Indicates whether this is Node.js/io.js. */
	public readonly isNode: boolean			=
		typeof (<any> self).process === 'object' &&
		typeof (<any> self).require === 'function'
	;

	/** Indicates whether this should be considered a tablet. */
	public readonly isTablet: boolean		= this.isMobile && self.outerWidth > 767;

	/** Indicates whether this is a touchscreen environment. */
	public readonly isTouch: boolean		= (() => {
		/* TODO: HANDLE NATIVE */
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch (_) {
			return false;
		}
	})();

	/** Indicates whether this is (the main thread of) a Web environment. */
	public readonly isWeb: boolean			= IS_WEB;

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

	/** Base URI for sending an SMS. */
	public readonly smsUriBase: string	=
		'sms:' +
		(this.isIOS8Plus ? '&' : this.isIOS ? ';' : '?') +
		'body='
	;

	/** Current user agent (lowercase). */
	public readonly userAgent: string	= Env.UA;

	constructor () {
		super();
	}
}

/** @see Env */
export const env	= new Env();
