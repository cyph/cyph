/* tslint:disable */

import {config} from './config';


/**
 * Subset of Env that gets modified by find/replace statements in
 * the deploy script; exercise EXTREME caution when modifying this file.
 */
export class EnvDeploy {
	/** Indicates whether this is local dev environment. */
	public readonly isLocalEnv: boolean			= true;

	/** Indicates whether this is the production environment. */
	public readonly isProd: boolean 			= false;

	/** Indicates whether this is our Tor site. */
	public readonly isOnion: boolean			=
		locationData.host.split('.').slice(-1)[0] === 'onion'
	;

	/** URL for backend API ("https://api.cyph.com/" or equivalent). */
	public readonly baseUrl: string				= this.isOnion ?
		`https://api.${config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:42000/`
	;

	/** URL for Cyph website ("https://www.cyph.com/" or equivalent). */
	public readonly homeUrl: string				= this.isOnion ?
		`https://www.${config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:42001/`
	;

	/** Base URL for a new cyph link ("https://cyph.ws/" or equivalent). */
	public readonly newCyphBaseUrl: string		= customBuild ?
		`https://${customBuild}/` :
		`${locationData.protocol}//${locationData.hostname}:42002/`
	;

	/** URL for starting a new cyph ("https://cyph.im/" or equivalent). */
	public readonly newCyphUrl: string			= customBuild || this.isLocalEnv ?
		this.newCyphBaseUrl :
		this.isOnion ?
			`https://im.${config.onionRoot}/` :
			`CYPH-IM/`
	;

	/** Base URL for a new me cyph link ("https://cyph.ws/#me/" or equivalent). */
	public readonly cyphMeBaseUrl: string		= `${this.newCyphBaseUrl}#me/`;

	/** URL for starting a new me cyph ("https://cyph.me/" or equivalent). */
	public readonly cyphMeUrl: string			= customBuild || this.isLocalEnv ?
		this.cyphMeBaseUrl :
		this.isOnion ?
			`https://me.${config.onionRoot}/` :
			`CYPH-ME/`
	;

	/** Base URL for a new io cyph link ("https://cyph.ws/#io/" or equivalent). */
	public readonly cyphIoBaseUrl: string		= `${this.newCyphBaseUrl}#io/`;

	/** URL for starting a new io cyph ("https://cyph.io/" or equivalent). */
	public readonly cyphIoUrl: string			= customBuild || this.isLocalEnv ?
		this.cyphIoBaseUrl :
		this.isOnion ?
			`https://io.${config.onionRoot}/` :
			`CYPH-IO/`
	;

	/** Base URL for a new video cyph link ("https://cyph.ws/#video/" or equivalent). */
	public readonly cyphVideoBaseUrl: string	= `${this.newCyphBaseUrl}#video/`;

	/** URL for starting a new video cyph ("https://cyph.video/" or equivalent). */
	public readonly cyphVideoUrl: string		= customBuild || this.isLocalEnv ?
		this.cyphVideoBaseUrl :
		this.isOnion ?
			`https://video.${config.onionRoot}/` :
			`CYPH-VIDEO/`
	;

	/** Base URL for a new audio cyph link ("https://cyph.ws/#audio/" or equivalent). */
	public readonly cyphAudioBaseUrl: string	= `${this.newCyphBaseUrl}#audio/`;

	/** URL for starting a new audio cyph ("https://cyph.audio/" or equivalent). */
	public readonly cyphAudioUrl: string		= customBuild || this.isLocalEnv ?
		this.cyphAudioBaseUrl :
		this.isOnion ?
			`https://audio.${config.onionRoot}/` :
			`CYPH-AUDIO/`
	;

	/** Firebase-related config. */
	public readonly firebaseConfig				= {
		apiKey: 'AIzaSyBQmgjG4klHr0TWUrBsGAgKPGSFFM1FSeI',
		authDomain: 'cyph-test.firebaseapp.com',
		databaseURL: 'https://cyph-test.firebaseio.com', // `ws://${`${locationData.hostname}.`.replace(/(localhost|127\.0\.0\.1|0\.0\.0\.0)\.$/, '127.0.1')}:44000`,
		storageBucket: 'cyph-test.appspot.com',
	};

	/** Content Security Policy defined in shared/csp. */
	public readonly CSP: string					= "DEFAULT_CSP";

	constructor () {}
}
