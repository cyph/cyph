/* tslint:disable:cyclomatic-complexity */

import {environment} from '../environments';
import {config} from './config';
import {EnvDeploy, envDeploy} from './env-deploy';
import {IEnvironment} from './proto';


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


	/** @ignore */
	private readonly useBaseUrl: boolean		= !!environment.customBuild || environment.local;

	/** @see IEnvironment */
	public readonly environment: IEnvironment	= environment;

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

	/** Base URL for a new audio cyph link ("https://cyph.ws/#audio/" or equivalent). */
	public readonly cyphAudioBaseUrl: string;

	/** @inheritDoc */
	public readonly cyphAudioUrl: string;

	/** Base URL for a new io cyph link ("https://cyph.ws/#io/" or equivalent). */
	public readonly cyphIoBaseUrl: string;

	/** @inheritDoc */
	public readonly cyphIoUrl: string;

	/** Base URL for an accounts link ("https://cyph.ws/#account/" or equivalent). */
	public readonly cyphMeBaseUrl: string;

	/** @inheritDoc */
	public readonly cyphMeUrl: string;

	/** Base URL for a new video cyph link ("https://cyph.ws/#video/" or equivalent). */
	public readonly cyphVideoBaseUrl: string;

	/** @inheritDoc */
	public readonly cyphVideoUrl: string;

	/** Debug mode (true by default in local env). */
	public readonly debug: boolean				=
		typeof this.environment.debug === 'boolean' ?
			this.environment.debug :
			this.environment.local
	;

	/** Firebase-related config. */
	public readonly firebaseConfig				= {
		apiKey: this.environment.firebase.apiKey,
		authDomain: `${this.environment.firebase.project}.firebaseapp.com`,
		databaseURL: `wss://${this.environment.firebase.project}.firebaseio.com`,
		messagingSenderId: this.environment.firebase.messagingSenderId,
		projectId: this.environment.firebase.project,
		storageBucket: `${this.environment.firebase.project}.appspot.com`,
	};

	/** Complete (lowercase) language code, e.g. "en-us". */
	public readonly fullLanguage: string		= Env.language.toLowerCase();

	/** Indicates whether this is Android. */
	public readonly isAndroid: boolean			= /android/.test(Env.UA) || (
		(<any> self).device &&
		(<any> self).device.platform === 'Android'
	);

	/** Indicates whether this is Chrome. */
	public readonly isChrome: boolean			= /chrome/.test(Env.UA) && !/edge/.test(Env.UA);

	/** Indicates whether this is Cordova. */
	public readonly isCordova: boolean			= (<any> self).cordova !== undefined;

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
	public readonly isIOS: boolean				= /ipad|iphone|ipod/.test(Env.UA) || (
		(<any> self).device &&
		(<any> self).device.platform === 'iOS'
	);

	/** @see IEnvironment.local */
	public readonly isLocalEnv: boolean			= this.environment.local;

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

	/** @inheritDoc */
	public readonly newCyphBaseUrl: string		=
		this.environment.customBuild && !this.environment.local && this.coBranded ?
			`https://${this.environment.customBuild.id}/` :
			envDeploy.newCyphBaseUrl
	;

	/** @inheritDoc */
	public readonly newCyphUrl: string			= this.useBaseUrl ?
		this.newCyphBaseUrl :
		envDeploy.newCyphUrl
	;

	/** Complete (original case) language code, e.g. "en-US". */
	public readonly realLanguage: string		= Env.language;

	/** Indicates whether minimal affiliate advertising should be displayed. */
	public readonly showAds: boolean			= !this.environment.customBuild;

	/** Indicates whether Granim gradient canvases should be displayed. */
	public readonly showGranim: boolean			=
		!this.isOldFirefox &&
		!this.isMobile
	;

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

		this.cyphAudioBaseUrl	= `${this.newCyphBaseUrl}#audio/`;
		this.cyphIoBaseUrl		= `${this.newCyphBaseUrl}#io/`;
		this.cyphMeBaseUrl		= `${this.newCyphBaseUrl}#account/`;
		this.cyphVideoBaseUrl	= `${this.newCyphBaseUrl}#video/`;

		this.cyphAudioUrl	= this.useBaseUrl ? this.cyphAudioBaseUrl : envDeploy.cyphAudioUrl;
		this.cyphIoUrl		= this.useBaseUrl ? this.cyphIoBaseUrl : envDeploy.cyphIoUrl;
		this.cyphMeUrl		= this.useBaseUrl ? this.cyphMeBaseUrl : envDeploy.cyphMeUrl;
		this.cyphVideoUrl	= this.useBaseUrl ? this.cyphVideoBaseUrl : envDeploy.cyphVideoUrl;
	}
}

/** @see Env */
export const env	= new Env();
