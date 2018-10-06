/* tslint:disable:cyclomatic-complexity */

import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {environment} from '../environments';
import {config} from './config';
import {EnvDeploy, envDeploy} from './env-deploy';
import {IEnvironment} from './proto';
import {WindowWatcherService} from './services/window-watcher.service';
import {toBehaviorSubject} from './util/flatten-observable';
import {toInt} from './util/formatting';


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

	/** If applicable, default call type. */
	public readonly callType?: 'audio'|'video'	= (
		environment.customBuild && environment.customBuild.config.callTypeVideo ?
			'video' :
		environment.customBuild && environment.customBuild.config.callTypeAudio ?
			'audio' :
			undefined
	);

	/** Google Chrome version, if applicable. */
	public readonly chromeVersion: number		=
		toInt((Env.UA.match(/chrome\/(\d+)/) || [])[1])
	;

	/** Indicates whether this is a co-branded (or white label) instance of Cyph. */
	public readonly coBranded: boolean			=
		environment.customBuild !== undefined &&
		environment.customBuild.favicon !== undefined
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
		typeof environment.debug === 'boolean' ?
			environment.debug :
			environment.local
	;

	/** Indicates whether debug logging is enabled (true by default when debug is true). */
	public readonly debugLog: boolean			=
		(environment.customBuild && environment.customBuild.config.accountsOnly) ||
		this.debug
	;

	/** @see IEnvironment */
	public readonly environment: IEnvironment	= environment;

	/** Firebase-related config. */
	public readonly firebaseConfig				= {
		apiKey: environment.firebase.apiKey,
		authDomain: `${environment.firebase.project}.firebaseapp.com`,
		databaseURL: `wss://${environment.firebase.project}.firebaseio.com`,
		messagingSenderId: environment.firebase.messagingSenderId,
		projectId: environment.firebase.project,
		storageBucket: `${environment.firebase.project}.appspot.com`
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
		environment.customBuild !== undefined &&
		environment.customBuild.config.browserExtension === true
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
	public readonly isLocalEnv: boolean			= environment.local;

	/** Indicates whether this is macOS / OS X. */
	public readonly isMacOS: boolean			= /mac os x/.test(Env.UA);

	/** Indicates whether this is the main thread. */
	public readonly isMainThread: boolean		= typeof (<any> self).importScripts !== 'function';

	/** Indicates whether this is a mobile screen size (equivalent to Flex Layout lt-md). */
	public readonly isMobile: BehaviorSubject<boolean>;

	/** Indicates whether this is a mobile operating system. */
	public readonly isMobileOS: boolean			=
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
		!(toInt((Env.UA.match(/firefox\/(\d+)/) || [])[1]) >= 57)
	;

	/** Indicates whether this is Safari. */
	public readonly isSafari: boolean			= navigatorData.vendor === 'Apple Computer, Inc.';

	/** @see CustomBuildConfig.telehealth */
	public readonly isTelehealth: boolean		=
		environment.customBuild !== undefined &&
		environment.customBuild.config.telehealth === true
	;

	/** Indicates whether this is a WebKit/Blink browser. */
	public readonly isWebKit: boolean			=
		this.isChrome ||
		this.isSafari ||
		!!(
			this.isWeb &&
			document.documentElement &&
			'WebkitAppearance' in document.documentElement.style
		)
	;

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
		(
			environment.customBuild &&
			!environment.local &&
			!environment.customBuild.config.accountsOnly
		) ?
			`https://${environment.customBuild.id}/` :
			envDeploy.newCyphBaseUrl
	;

	/** @inheritDoc */
	public readonly newCyphUrl: string			= this.useBaseUrl ?
		this.newCyphBaseUrl :
		envDeploy.newCyphUrl
	;

	/** Platform name ("android", "ios", "unknown", "web"). */
	public readonly platform: string			=
		!this.isCordova && this.isWeb ?
			'web' :
		this.isAndroid ?
			'android' :
		this.isIOS ?
			'ios' :
			'unknown'
	;

	/** Complete (original case) language code, e.g. "en-US". */
	public readonly realLanguage: string		= Env.language;

	/** Indicates whether this is Safari 10.0 or older. */
	public readonly safariVersion?: number		=
		this.isSafari ?
			parseFloat((Env.UA.match(/version\/(\d+\.\d+)/) || [])[1] || '0') :
			undefined
	;

	/** Indicates whether minimal affiliate advertising should be displayed. */
	public readonly showAds: boolean			= !environment.customBuild;

	/** Indicates whether Granim gradient canvases should be displayed. */
	public readonly showGranim: boolean			=
		!this.isExtension &&
		!this.isOldFirefox &&
		!this.isMobile &&
		!(
			environment.customBuild &&
			environment.customBuild.config.backgroundColor
		)
	;

	/** Base URI for sending an SMS. */
	public readonly smsUriBase: string			= `sms:${this.isIOS ? '&' : '?'}body=`;

	/** Current user agent (lowercase). */
	public readonly userAgent: string			= Env.UA;

	/** Indicates whether this is a full white label instance of Cyph. */
	public readonly whiteLabel: boolean			=
		environment.customBuild !== undefined &&
		environment.customBuild.config.whiteLabel === true
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

		if (this.isExtension || !this.isWeb) {
			this.isMobile	= new BehaviorSubject(true);
			return;
		}

		const detectIfMobile		= (width: number) => width <= config.responsiveMaxWidths.sm;
		const windowWatcherService	= new WindowWatcherService(this);

		this.isMobile	= toBehaviorSubject(
			windowWatcherService.width.pipe(map(detectIfMobile)),
			detectIfMobile(windowWatcherService.width.value)
		);
	}
}

/** @see Env */
export const env	= new Env();
