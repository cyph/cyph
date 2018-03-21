/* tslint:disable:cyclomatic-complexity */

import {config} from './config';
import {EnvDeploy} from './env-deploy';


/**
 * Dynamic values calculated at run-time.
 */
export class Env extends EnvDeploy {
	/** @ignore */
	private static readonly language: string	= (
		navigatorData.language ||
		(<any> navigatorData).userLanguage ||
		(<any> navigatorData).browserLanguage ||
		(<any> navigatorData).systemLanguage ||
		config.defaultLanguage
	);

	/** @ignore */
	private static readonly UA: string			= navigatorData.userAgent.toLowerCase();


	/** If applicable, default call type. */
	public readonly callType?: 'audio'|'video'	= (
		this.environment.customBuild && this.environment.customBuild.config.callTypeVideo ?
			'video' :
			this.environment.customBuild && this.environment.customBuild.config.callTypeAudio ?
				'audio' :
				undefined
	);

	/** Google Chrome version, if applicable. */
	public readonly chromeVersion: number		=
		Number.parseInt((Env.UA.match(/chrome\/(\d+)/) || [])[1], 10)
	;

	/** Indicates whether this is a co-branded (or white label) instance of Cyph. */
	public readonly coBranded: boolean			=
		this.environment.customBuild !== undefined &&
		this.environment.customBuild.favicon !== undefined
	;

	/** Complete (lowercase) language code, e.g. "en-us". */
	public readonly fullLanguage: string		= Env.language.toLowerCase();

	/** Current URL host (with www subdomain removed). */
	public readonly host: string				= locationData.host.replace('www.', '');

	/** Indicates whether this is Android. */
	public readonly isAndroid: boolean			= /android/.test(Env.UA);

	/** Indicates whether this is Chrome. */
	public readonly isChrome: boolean			= /chrome/.test(Env.UA) && !/edge/.test(Env.UA);

	/** Indicates whether this is Edge. */
	public readonly isEdge: boolean				= /edge\/\d+/.test(Env.UA);

	/** @see CustomBuildConfig.browserExtension */
	public readonly isExtension: boolean		=
		this.environment.customBuild !== undefined &&
		this.environment.customBuild.config.browserExtension === true
	;

	/** Indicates whether this is mobile Firefox. */
	public readonly isFFMobile: boolean			=
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
	public readonly isFirefox: boolean			= /firefox/.test(Env.UA);

	/** Indicates whether this is the Cyph corporate website (cyph.com). */
	public readonly isHomeSite: boolean			=
		this.homeUrl.split('/')[2].replace('www.', '') === this.host
	;

	/** Indicates whether this is iOS. */
	public readonly isIOS: boolean				= /ipad|iphone|ipod/.test(Env.UA);

	/** Indicates whether this is macOS / OS X. */
	public readonly isMacOS: boolean			= /mac os x/.test(Env.UA);

	/** Indicates whether this is the main thread. */
	public readonly isMainThread: boolean		= typeof (<any> self).importScripts !== 'function';

	/** Indicates whether this is mobile. */
	public readonly isMobile: boolean			=
		this.isAndroid ||
		this.isIOS ||
		this.isFFMobile
	;

	/** Indicates whether this is Node.js/io.js. */
	public readonly isNode: boolean				=
		typeof (<any> self).process === 'object' &&
		typeof (<any> self).require === 'function'
	;

	/** Indicates whether this is a version of Firefox before 57 ("Quantum"). */
	public readonly isOldFirefox: boolean		=
		this.isFirefox &&
		!(Number.parseInt((Env.UA.match(/firefox\/(\d+)/) || [])[1], 10) >= 57)
	;

	/** Indicates whether this is Safari. */
	public readonly isSafari: boolean			= navigatorData.vendor === 'Apple Computer, Inc.';

	/** Indicates whether this should be considered a tablet. */
	public readonly isTablet: boolean			= this.isMobile && self.outerWidth > 767;

	/** @see CustomBuildConfig.telehealth */
	public readonly isTelehealth: boolean		=
		this.environment.customBuild !== undefined &&
		this.environment.customBuild.config.telehealth === true
	;

	/** Indicates whether this is a touchscreen environment. */
	public readonly isTouch: boolean			= (() => {
		/* TODO: HANDLE NATIVE */
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch {
			return false;
		}
	})();

	/** Indicates whether this is (the main thread of) a Web environment. */
	public readonly isWeb: boolean				= IS_WEB;

	/** Normalized language code, used for translations. */
	public readonly language: string			= (() => {
		const language: string	= this.fullLanguage.split('-')[0];

		/* Consistency in special cases */
		return language === 'nb' ?
			'no' :
			this.fullLanguage === 'zh-tw' ?
				'zh-cht' :
				language === 'zh' ?
					'zh-chs' :
					language
		;
	})();

	/** Complete (original case) language code, e.g. "en-US". */
	public readonly realLanguage: string		= Env.language;

	/** Indicates whether Granim gradient canvases should be displayed. */
	public readonly showGranim: boolean			= !this.isOldFirefox;

	/** Base URI for sending an SMS. */
	public readonly smsUriBase: string			= `sms:${this.isIOS ? '&' : '?'}body=`;

	/** Current user agent (lowercase). */
	public readonly userAgent: string			= Env.UA;

	/** Indicates whether this is a full white label instance of Cyph. */
	public readonly whiteLabel: boolean			=
		this.environment.customBuild !== undefined &&
		this.environment.customBuild.config.whiteLabel === true
	;

	constructor () {
		super();
	}
}

/** @see Env */
export const env	= new Env();
