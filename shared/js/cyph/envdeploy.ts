/* tslint:disable */

import {config} from './config';


/**
 * Subset of Env that gets modified by find/replace statements in
 * the deploy script; exercise EXTREME caution when modifying this file.
 */
export class EnvDeploy {
	/** Indicates whether this is local dev environment. */
	public readonly isLocalEnv: boolean			= true;

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

	/** Base URL for a new cyph link ("https://cyph.im/" or equivalent). */
	public readonly newCyphBaseUrl: string		= customBuild ?
		`https://${customBuild}/` :
		`${locationData.protocol}//${locationData.hostname}:42002/`
	;

	/** URL for starting a new cyph (same as newCyphBaseUrl except on Onion site). */
	public readonly newCyphUrl: string			= this.isOnion && !customBuild ?
		`https://im.${config.onionRoot}/` :
		this.newCyphBaseUrl
	;

	/** Base URL for Cyph account application ("https://cyph.io/" or equivalent). */
	public readonly cyphMeBaseUrl: string		= customBuild ?
		`${this.newCyphBaseUrl}#me/` : 
		`CYPH-ME/`
	;

	/** URL for Cyph account application (same as cyphMeBaseUrl except on Onion site). */
	public readonly cyphMeUrl: string			= this.isOnion && !customBuild ?
		`https://me.${config.onionRoot}/` :
		this.cyphMeBaseUrl
	;

	/** Base URL for a new file transfer cyph link ("https://cyph.io/" or equivalent). */
	public readonly cyphIoBaseUrl: string		= customBuild ?
		`${this.newCyphBaseUrl}#io/` : 
		`CYPH-IO/`
	;

	/** URL for starting a new file transfer cyph (same as cyphIoBaseUrl except on Onion site). */
	public readonly cyphIoUrl: string			= this.isOnion && !customBuild ?
		`https://io.${config.onionRoot}/` :
		this.cyphIoBaseUrl
	;

	/** Base URL for a new video cyph link ("https://cyph.video/" or equivalent). */
	public readonly cyphVideoBaseUrl: string	= customBuild ?
		`${this.newCyphBaseUrl}#video/` : 
		`CYPH-VIDEO/`
	;

	/** URL for starting a new video cyph (same as cyphVideoBaseUrl except on Onion site). */
	public readonly cyphVideoUrl: string		= this.isOnion && !customBuild ?
		`https://video.${config.onionRoot}/` :
		this.cyphVideoBaseUrl
	;

	/** Base URL for a new audio cyph link ("https://cyph.audio/" or equivalent). */
	public readonly cyphAudioBaseUrl: string	= customBuild ?
		`${this.newCyphBaseUrl}#audio/` : 
		`CYPH-AUDIO/`
	;

	/** URL for starting a new audio cyph (same as cyphAudioBaseUrl except on Onion site). */
	public readonly cyphAudioUrl: string		= this.isOnion && !customBuild ?
		`https://audio.${config.onionRoot}/` :
		this.cyphAudioBaseUrl
	;

	/** Endpoint for Firebase server. */
	public readonly firebaseEndpoint: string	=
		`ws://${`${locationData.hostname}.home.`.replace('localhost.home.', '127.0.1')}:44000`
	;

	/** Content Security Policy defined in shared/csp. */
	public readonly CSP: string					= "DEFAULT_CSP";

	constructor () {}
}
