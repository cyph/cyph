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
		apiKey: 'AIzaSyBQmgjG4klHr0TWUrBsGAgKPGSFFM1FSeI',
		authDomain: 'cyph-test.firebaseapp.com',
		databaseURL: 'https://cyph-test.firebaseio.com',
		storageBucket: 'cyph-test.appspot.com'
	};

	/*
	public readonly firebaseConfig			= {
		apiKey: 'AIzaSyB7B8i8AQPtgMXS9o6zbfX1Vv-PwW2Q0Jo',
		authDomain: 'cyphme.firebaseapp.com',
		databaseURL: this.firebaseEndpoint,
		storageBucket: 'cyphme.appspot.com'
	};
	*/

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

	/** Indicates whether this is Chrome. */
	public readonly isChrome: boolean		= /chrome/.test(Env.UA) && !/edge/.test(Env.UA);

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

	/** Indicates whether this is Firefox. */
	public readonly isFirefox: boolean		= /firefox/.test(Env.UA);

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

	/** Indicates whether this is Safari. */
	public readonly isSafari: boolean		= navigator.vendor === 'Apple Computer, Inc.';

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

	/** Package/environment name. */
	public readonly packageName: string		= (() => {
		try {
			const timestamp	= parseInt(localStorage.getItem('webSignPackageTimestamp') || '', 10);

			if (!isNaN(timestamp)) {
				return `${this.host} ${timestamp.toString()}`;
			}
		}
		catch (_) {}

		return this.host;
	})();

	/** Base URI for sending an SMS. */
	public readonly smsUriBase: string		=
		`sms:${this.isIOS8Plus ? '&' : this.isIOS ? ';' : '?'}body=`
	;

	/** Current user agent (lowercase). */
	public readonly userAgent: string		= Env.UA;

	/**
	 * Indicates whether the currently pinned version of WebSign has a known issue
	 * and the user should be advised to replace it.
	 */
	public readonly webSignError: boolean	= (() => {
		const affectedWebSignHashes	= [
			'c69d24ad20d6b0693fc37dd8c60f20f80be5b3251286a0ddbcb632e04fac0312' +
				'3c80d1319706bfdab1992e39f3cc5c6b93dbfc05d9dd30c03d2109cd7793453a'
			,
			'351749074a823a34dd436c7bce0b9c5e3ff678f71c8d31868c7057c2dfd79625' +
				'31ce0d93d42bd1e765629bf20acc1482782e39ecf70fa91e76797607a6c613fc'
			,
			'f33c04c1831c71fceb19d3d8071d9bb9d6cacd133312a5efe7ea354d8a95a497' +
				'381a57d3da3d56ac76432764eea368d1c13d0b97a1a30680363bf0511c6bbd54'
			,
			'24e893c57959e5b463e8372f63b32bdea61c58e3a78e2c673dc900f01d77a6ae' +
				'478923f763ec69127b7ff4409071e43c29a470c9301db469c4ef521ba6bee5c0'
			,
			'3cd6225226160d5a1c8f39193837a460c1cf58e94f6a28b75ac6d1ec8764226d' +
				'6093754fa21e826874b140c7071f3133533cd69b07f2107cc646c47a2742be3f'
			,
			'ac3e65f02e2be2e84f8eb6acc16bb7c7f37967ae11374cf07d6262a2b56c79be' +
				'631fed426398934a18a00569d134c3a7fe9bf475d406887e27550a27469feadc'
			,
			'69f97b88d00c6e1d4683fb7771b27291b7dbb998a58bba9127b6c79e7ea6044c' +
				'88482237e8ad0dd8dd6b34ad9edfd21cb0bcf0831a98cd86e774be40002be3b1'
			,
			'fe3faada0741459ccaed88b622a795aa62aed79fbcb325a5ad6594d875611ba6' +
				'e35cad39dea62b7d13e0b5c655b802914d398895e197459b91cba28e02361df9'
		];

		try {
			const isAffectedBrowser	= /\/#test$/.test(new Request('https://cyph.ws/#test').url);
			const webSignHash		= localStorage.getItem('webSignHash');

			if (webSignHash) {
				return isAffectedBrowser && affectedWebSignHashes.indexOf(webSignHash) > -1;
			}
		}
		catch (_) {}

		return false;
	})();

	constructor () {
		super();
	}
}

/** @see Env */
export const env	= new Env();
