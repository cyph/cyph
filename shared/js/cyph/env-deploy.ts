/* eslint-disable */

import {config} from './config';

/**
 * Subset of Env that gets modified by find/replace statements in
 * the deploy script; exercise EXTREME caution when modifying this file.
 */
export class EnvDeploy {
	/** @ignore */
	protected static readonly UA: string =
		navigatorData.userAgent.toLowerCase();

	/** @ignore */
	public static readonly languageInternal: string =
		navigatorData.language ||
		(<any> navigatorData).userLanguage ||
		(<any> navigatorData).browserLanguage ||
		(<any> navigatorData).systemLanguage ||
		config.defaultLanguage;

	/** @see EnvDeploy.cyphImUrl */
	protected readonly _cyphImUrl: string;

	/** @see EnvDeploy.newCyphBaseUrl */
	protected readonly _newCyphBaseUrl: string;

	/** Current URL host (with www subdomain removed). */
	public readonly host: string = locationData.host.replace('www.', '');

	/**
	 * Hardcoded to false in EnvDeploy and set to the correct value by Env.
	 * @see IEnvironment.local
	 */
	public readonly isLocalEnv: boolean = false;

	/** Indicates whether this is our Tor site. */
	public readonly isOnion: boolean =
		this.host.split('.').slice(-1)[0] === 'onion';

	/** Indicates whether this is the Cyph SDK. */
	public readonly isSDK: boolean = false;

	/** Indicates whether this is (the main thread of) a Web environment. */
	public readonly isWeb: boolean = IS_WEB;

	/** URL for an accounts link ("https://cyph.app/" or equivalent). */
	public readonly appUrl: string = this.isOnion ?
		`https://app.${config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:42002/`;

	/** URL for backend API ("https://api.cyph.com/" or equivalent). */
	public readonly baseUrl: string = this.isOnion ?
		`https://api.${config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:42000/`;

	/** URL for Cyph website ("https://www.cyph.com/" or equivalent). */
	public readonly homeUrl: string = this.isOnion ?
		`https://www.${config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:43000/`;

	/** Variant of homeUrl for local environments. */
	public readonly homeUrlLocalAlt: string = this.isOnion ?
		`https://www.${config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:42001/`;

	/** Base URL for a new cyph link ("https://cyph.app/#burner/" or equivalent). */
	public get newCyphBaseUrl () : string {
		return this._newCyphBaseUrl;
	}

	/** URL for starting a new audio cyph ("https://cyph.audio/" or equivalent). */
	public readonly cyphAudioUrl: string = this.isOnion ?
		`https://audio.${config.onionRoot}/` :
		`CYPH-AUDIO/`;

	/** URL for an accounts download link ("https://cyph.download/" or equivalent). */
	public readonly cyphDownloadUrl: string = this.isOnion ?
		`https://download.${config.onionRoot}/` :
		`CYPH-DOWNLOAD/`;

	/** URL for starting a new cyph ("https://cyph.im/" or equivalent). */
	public get cyphImUrl () : string {
		return this._cyphImUrl;
	}

	/** URL for starting a new file transfer cyph ("https://cyph.io/" or equivalent). */
	public readonly cyphIoUrl: string = this.isOnion ?
		`https://io.${config.onionRoot}/` :
		`CYPH-IO/`;

	/** URL for an accounts profile link ("https://cyph.me/" or equivalent). */
	public readonly cyphMeUrl: string = this.isOnion ?
		`https://me.${config.onionRoot}/` :
		`CYPH-ME/`;

	/** URL for starting a new video cyph ("https://cyph.video/" or equivalent). */
	public readonly cyphVideoUrl: string = this.isOnion ?
		`https://video.${config.onionRoot}/` :
		`CYPH-VIDEO/`;

	/** Content Security Policy defined in shared/csp. */
	public readonly CSP: string = "'DEFAULT_CSP'";

	/** Firebase-related config. */
	// public readonly localFirebaseDatabaseURL: string = `ws://${`${locationData.hostname}.`.replace(/(localhost|127\.0\.0\.1|0\.0\.0\.0)\.$/, '127.0.1')}:44000`;

	/** Discount rate for Everflow checkouts. */
	public readonly everflowDiscountRate: number = 20;

	/** Everflow offer ID. */
	public readonly everflowOfferID: string = '4';

	/** Complete (lowercase) language code, e.g. "en-us". */
	public readonly fullLanguage: string =
		EnvDeploy.languageInternal.toLowerCase();

	/** Normalized language code, used for translations. */
	public readonly language: string = (() => {
		const language = this.fullLanguage.split('-')[0];

		/* Consistency in special cases */
		return language === 'nb' ?
			'no' :
		this.fullLanguage === 'zh-tw' ?
			'zh-cht' :
		language === 'zh' ?
			'zh-chs' :
			language;
	})();

	/** Current user agent (lowercase). */
	public readonly userAgent: string = EnvDeploy.UA;

	constructor () {
		this._cyphImUrl = this.isOnion ?
			`https://im.${config.onionRoot}/` :
			`CYPH-IM/`;

		this._newCyphBaseUrl = `${this.appUrl}#burner/`;
	}
}

/** @see EnvDeploy */
export const envDeploy = new EnvDeploy();
