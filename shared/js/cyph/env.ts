/* eslint-disable complexity */

import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {environment} from '../environments/environment';
import {config} from './config';
import {EnvDeploy, envDeploy} from './env-deploy';
import {IEnvironment} from './proto/types';
import {WindowWatcherService} from './services/window-watcher.service';
import {toBehaviorSubject} from './util/flatten-observable';
import {toInt} from './util/formatting';

/**
 * Dynamic values calculated at run-time.
 */
export class Env extends EnvDeploy {
	/** @ignore */
	private readonly useBaseUrl: boolean =
		!!environment.customBuild || environment.local;

	/** @inheritDoc */
	protected readonly _cyphImUrl: string =
		environment.local || !environment.customBuild ?
			envDeploy.newCyphBaseUrl :
			`https://${environment.customBuild.id}/${
				environment.customBuild.config.burnerOnly ? '' : '#burner/'
			}`;

	/** @inheritDoc */
	protected readonly _newCyphBaseUrl: string =
		environment.local || !environment.customBuild ?
			envDeploy.newCyphBaseUrl :
			`https://${environment.customBuild.id}/${
				environment.customBuild.config.burnerOnly ? '' : '#burner/'
			}`;

	/** Unique string representing the current package. */
	public readonly appName: string = `com.cyph.app-${
		environment.customBuild?.namespace || 'cyph.ws'
	}-${environment.envName}`;

	/** @inheritDoc */
	public readonly appUrl: string =
		!environment.customBuild || environment.local || this.isOnion ?
			envDeploy.appUrl :
		environment.customBuild.config.burnerOnly ?
			envDeploy.newCyphBaseUrl :
			`https://${environment.customBuild.id}/`;

	/** If applicable, default call type. */
	public readonly callType?: 'audio' | 'video' = environment.customBuild
		?.config.callTypeVideo ?
		'video' :
	environment.customBuild?.config.callTypeAudio ?
		'audio' :
		undefined;

	/** Google Chrome version, if applicable. */
	public readonly chromeVersion: number = toInt(
		(Env.UA.match(/chrome\/(\d+)/) || [])[1]
	);

	/** Indicates whether this is a co-branded (or white label) instance of Cyph. */
	public readonly coBranded: boolean =
		environment.customBuild?.favicon !== undefined;

	/** Base URL for a new audio cyph link ("https://cyph.app/#burner/audio/" or equivalent). */
	public readonly cyphAudioBaseUrl: string;

	/** @inheritDoc */
	public readonly cyphAudioUrl: string;

	/** @inheritDoc */
	public readonly cyphDownloadUrl: string =
		!environment.local && this.appUrl === envDeploy.appUrl ?
			envDeploy.cyphDownloadUrl :
			`${this.appUrl}#download/`;

	/** Base URL for a new io cyph link ("https://cyph.app/#burner/io/" or equivalent). */
	public readonly cyphIoBaseUrl: string;

	/** @inheritDoc */
	public readonly cyphIoUrl: string;

	/** @inheritDoc */
	public readonly cyphMeUrl: string =
		!environment.local && this.appUrl === envDeploy.appUrl ?
			envDeploy.cyphMeUrl :
			`${this.appUrl}profile/`;

	/** Base URL for a new video cyph link ("https://cyph.app/#burner/video/" or equivalent). */
	public readonly cyphVideoBaseUrl: string;

	/** @inheritDoc */
	public readonly cyphVideoUrl: string;

	/** Debug mode (true by default in local env). */
	public readonly debug: boolean =
		(typeof environment.debug === 'boolean' ?
			environment.debug :
			environment.local) ||
		(typeof (<any> localStorage) === 'object' &&
			/* eslint-disable-next-line @typescript-eslint/unbound-method */
			typeof (<any> localStorage).getItem === 'function' &&
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.getItem('debug') === 'true');

	/** Indicates whether debug logging is enabled (true by default when debug is true). */
	public readonly debugLog: boolean = this.debug;

	/** If applicable, local storage key for log backups. */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	public readonly debugLogID: string | undefined =
		this.debugLog && !environment.production ?
			`DebugLog_${Date.now().toString()}` :
			undefined;

	/** @see IEnvironment */
	public readonly environment: IEnvironment = environment;

	/** Everflow offer ID. */
	public everflowOfferID = environment.production ? '5' : '4';

	/** File-transfer-related config. */
	public readonly filesConfig: {
		maxImageWidth: number;
		maxSize: number;
		maxSizeDesktop: number;
		maxSizeMobile: number;
	};

	/** Firebase-related config. */
	public readonly firebaseConfig = {
		apiKey: environment.firebase.apiKey,
		appId: environment.firebase.appId,
		authDomain: `${environment.firebase.project}.firebaseapp.com`,
		databaseURL: `wss://${environment.firebase.project}.firebaseio.com`,
		messagingSenderId: environment.firebase.messagingSenderId,
		projectId: environment.firebase.project,
		storageBucket: `${environment.firebase.project}.appspot.com`
	};

	/** Number of available logical CPU cores. */
	public readonly hardwareConcurrency: number;

	/** Indicates whether platform-native in-app purchases are supported. */
	public readonly inAppPurchasesSupported: boolean;

	/** Indicates whether this is Android. */
	public readonly isAndroid: boolean =
		/android/.test(Env.UA) ||
		((<any> self).device && (<any> self).device.platform === 'Android');

	/** Indicates whether this is Chrome. */
	public readonly isChrome: boolean =
		/chrome/.test(Env.UA) && !/edge/.test(Env.UA);

	/** Indicates whether this is Cordova. */
	public readonly isCordova: boolean = (<any> self).cordova !== undefined;

	/** Indicates whether this is Cordova on a desktop OS. */
	public readonly isCordovaDesktop: boolean;

	/** Indicates whether this is Cordova on a desktop OS (GNU/Linux). */
	public readonly isCordovaDesktopLinux: boolean;

	/** Indicates whether this is Cordova on a desktop OS (macOS). */
	public readonly isCordovaDesktopMacOS: boolean;

	/** Indicates whether this is Cordova on a desktop OS (Windows). */
	public readonly isCordovaDesktopWindows: boolean;

	/** Indicates whether this is Cordova on a mobile OS. */
	public readonly isCordovaMobile: boolean;

	/** Indicates whether this is Cordova on a mobile OS (Android). */
	public readonly isCordovaMobileAndroid: boolean;

	/** Indicates whether this is Cordova on a mobile OS (iOS). */
	public readonly isCordovaMobileIOS: boolean;

	/** Indicates whether this is Edge. */
	public readonly isEdge: boolean;

	/** @see CustomBuildConfig.browserExtension */
	public readonly isExtension: boolean =
		environment.customBuild !== undefined &&
		environment.customBuild.config.browserExtension === true;

	/** Indicates whether this is mobile Firefox. */
	public readonly isFFMobile: boolean =
		/fennec/.test(Env.UA) ||
		(/firefox/.test(Env.UA) &&
			(this.isAndroid || /mobile/.test(Env.UA) || /tablet/.test(Env.UA)));

	/** Indicates whether this is Firefox. */
	public readonly isFirefox: boolean = /firefox/.test(Env.UA);

	/** Indicates whether this is the Cyph corporate website (cyph.com). */
	public readonly isHomeSite: boolean =
		this.homeUrl.split('/')[2].replace('www.', '') === this.host ||
		this.homeUrlLocalAlt.split('/')[2].replace('www.', '') === this.host;

	/** Indicates whether this is iOS. */
	public readonly isIOS: boolean =
		/ipad|iphone|ipod/.test(Env.UA) ||
		((<any> self).device && (<any> self).device.platform === 'iOS');

	/** @see IEnvironment.local */
	public readonly isLocalEnv: boolean = environment.local;

	/** Indicates whether this is macOS / OS X. */
	public readonly isMacOS: boolean = /mac os x/.test(Env.UA);

	/** Indicates whether this is the main thread. */
	public readonly isMainThread: boolean =
		typeof (<any> self).importScripts !== 'function';

	/** Indicates whether this is a mobile screen size (equivalent to Flex Layout lt-md). */
	public readonly isMobile: BehaviorSubject<boolean>;

	/** Indicates whether this is a mobile operating system. */
	public readonly isMobileOS: boolean =
		this.isAndroid || this.isIOS || this.isFFMobile;

	/** Indicates whether this is Node.js/io.js. */
	public readonly isNode: boolean =
		typeof (<any> self).process === 'object' &&
		typeof (<any> self).require === 'function';

	/** Indicates whether this is pre-Chromium Edge. */
	public readonly isOldEdge: boolean = /edge\/\d+/.test(Env.UA);

	/** Indicates whether this is a version of Firefox before 57 ("Quantum"). */
	public readonly isOldFirefox: boolean =
		this.isFirefox &&
		!(toInt((Env.UA.match(/firefox\/(\d+)/) || [])[1]) >= 57);

	/** Indicates whether this is Chromium Edge. */
	public readonly isNewEdge: boolean = /edg\/\d+/.test(Env.UA);

	/** Indicates whether this is Safari. */
	public readonly isSafari: boolean =
		navigatorData.vendor === 'Apple Computer, Inc.';

	/** @see CustomBuildConfig.telehealth */
	public readonly isTelehealth: boolean =
		environment.customBuild !== undefined &&
		(environment.customBuild.config.telehealth === true ||
			environment.customBuild.config.telehealthFull === true);

	/** @see CustomBuildConfig.telehealthFull */
	public readonly isTelehealthFull: boolean =
		environment.customBuild !== undefined &&
		environment.customBuild.config.telehealthFull === true;

	/** Indicates whether this is an automated test. */
	public readonly isTestRun: boolean =
		!!(<any> self).isReflectTest || !!environment.test;

	/** Indicates whether this is a WebKit/Blink browser. */
	public readonly isWebKit: boolean;

	/** Indicates whether in-app purchases are blocked. */
	public readonly noInAppPurchasesAllowed: boolean;

	/** Indicates whether in-app purchases and references to purchases are blocked. */
	public readonly noInAppPurchasesReferenceAllowed: boolean;

	/** Indicates whether register button should be hidden. */
	public readonly noInAppRegistrationAllowed: boolean;

	/** Platform name ("android", "electron", "ios", "unknown", "web"). */
	public readonly platform: string =
		!this.isCordova && this.isWeb ?
			'web' :
		this.isAndroid ?
			'android' :
		this.isIOS ?
			'ios' :
		!this.isMobileOS ?
			'electron' :
			'unknown';

	/** @see CustomBuildConfig.pro */
	public readonly pro = new BehaviorSubject<boolean>(
		environment.customBuild !== undefined &&
			environment.customBuild.config.pro === true
	);

	/** Complete (original case) language code, e.g. "en-US". */
	public readonly realLanguage: string = Env.languageInternal;

	/** reCAPTCHA client API key. */
	public readonly recaptchaAPIKey: string = environment.production ?
		'6LcxQ7UZAAAAAJEUFPpBY0gbe-ofgublTvPqNH50' :
		'6LfVSbUZAAAAAJhwvzCEbsYqWNBY5T7yYaOe0IcO';

	/** Indicates whether this is Safari 10.0 or older. */
	public readonly safariVersion?: number = this.isSafari ?
		parseFloat((Env.UA.match(/version\/(\d+\.\d+)/) || [])[1] || '0') :
		undefined;

	/** Indicates whether minimal affiliate advertising should be displayed. */
	public readonly showAds: boolean = false;

	/** Indicates whether Granim gradient canvases should be displayed. */
	public readonly showGranim: boolean =
		!this.isExtension &&
		!this.isOldFirefox &&
		!this.isMobileOS &&
		!environment.customBuild?.config.backgroundColor;

	/** Base URI for sending an SMS. */
	public readonly smsUriBase: string = `sms:${this.isIOS ? '&' : '?'}body=`;

	/** If true, telehealth theme is enabled. */
	public readonly telehealthTheme = new BehaviorSubject<boolean>(
		this.isTelehealth ||
			(environment.customBuild !== undefined &&
				environment.customBuild.config.telehealthTheme === true)
	);

	/** Paths to WebSign subresources. */
	public readonly webSignPaths = {
		serviceWorker: `${(<any> self).cordovaParent || '/'}serviceworker.js`,
		worker: `${(<any> self).cordovaParent || '/'}worker.js`
	};

	/** Indicates whether this is a full white label instance of Cyph. */
	public readonly whiteLabel: boolean =
		environment.customBuild !== undefined &&
		environment.customBuild.config.whiteLabel === true;

	constructor () {
		super();

		this.isEdge = this.isOldEdge || this.isNewEdge;

		this.isWebKit =
			!(this.isEdge || this.isFirefox) &&
			(this.isChrome ||
				this.isSafari ||
				!!(
					this.isWeb &&
					document.documentElement &&
					'WebkitAppearance' in document.documentElement.style
				));

		const filesConfigMaxSizeDesktop = 536870912;
		const filesConfigMaxSizeMobile = 20971520;

		this.filesConfig = {
			maxImageWidth: 1920,
			maxSize: this.isMobileOS ?
				filesConfigMaxSizeMobile :
				filesConfigMaxSizeDesktop,
			maxSizeDesktop: filesConfigMaxSizeDesktop,
			maxSizeMobile: filesConfigMaxSizeMobile
		};

		this.hardwareConcurrency = this.isTestRun ?
			1 :
			Math.max(
				Math.floor(
					(navigatorData.hardwareConcurrency || 2) /
						(this.isMobileOS ? 2 : 1)
				),
				1
			);

		this.isCordovaDesktop = this.isCordova && !this.isMobileOS;
		this.isCordovaMobile = this.isCordova && this.isMobileOS;

		if (this.isCordovaDesktop && typeof cordovaRequire === 'function') {
			const platform: string = cordovaRequire('os').platform();

			this.isCordovaDesktopLinux = platform === 'linux';
			this.isCordovaDesktopMacOS = platform === 'darwin';
			this.isCordovaDesktopWindows = platform === 'win32';
			this.isCordovaMobileAndroid = false;
			this.isCordovaMobileIOS = false;
		}
		else {
			this.isCordovaDesktopLinux = false;
			this.isCordovaDesktopMacOS = false;
			this.isCordovaDesktopWindows = false;
			this.isCordovaMobileAndroid =
				this.isCordovaMobile && this.isAndroid;
			this.isCordovaMobileIOS = this.isCordovaMobile && this.isIOS;
		}

		this.inAppPurchasesSupported =
			this.isCordovaMobileIOS &&
			typeof (<any> self).store?.register === 'function';

		this.noInAppPurchasesReferenceAllowed =
			this.isCordovaDesktopMacOS ||
			(this.isCordovaMobileIOS && !this.inAppPurchasesSupported);

		this.noInAppPurchasesAllowed =
			this.noInAppPurchasesReferenceAllowed ||
			this.isCordovaDesktopWindows;

		this.noInAppRegistrationAllowed = false;

		const newCyphBaseUrl =
			this.newCyphBaseUrl +
			(this.newCyphBaseUrl.indexOf('#') > -1 ? '' : '#');

		this.cyphAudioBaseUrl = `${newCyphBaseUrl}audio/`;
		this.cyphIoBaseUrl = `${newCyphBaseUrl}io/`;
		this.cyphVideoBaseUrl = `${newCyphBaseUrl}video/`;

		this.cyphAudioUrl = this.useBaseUrl ?
			this.cyphAudioBaseUrl :
			envDeploy.cyphAudioUrl;
		this._cyphImUrl = this.useBaseUrl ?
			this.newCyphBaseUrl :
			envDeploy.cyphImUrl;
		this.cyphIoUrl = this.useBaseUrl ?
			this.cyphIoBaseUrl :
			envDeploy.cyphIoUrl;
		this.cyphVideoUrl = this.useBaseUrl ?
			this.cyphVideoBaseUrl :
			envDeploy.cyphVideoUrl;

		if (this.isExtension || !this.isWeb) {
			this.isMobile = new BehaviorSubject<boolean>(true);
			return;
		}

		const detectIfMobile = (width: number) =>
			width <= config.responsiveMaxWidths.sm;
		const windowWatcherService = new WindowWatcherService(this);

		this.isMobile = toBehaviorSubject(
			windowWatcherService.width.pipe(map(detectIfMobile)),
			detectIfMobile(windowWatcherService.width.value)
		);
	}
}

/** @see Env */
export const env = new Env();
