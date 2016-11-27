/* tslint:disable */

import {Config} from './config';


/**
 * Subset of Env that gets modified by find/replace statements in
 * the deploy script; exercise EXTREME caution when modifying this file.
 */
export class EnvDeploy {
	/** Indicates whether this is local dev environment. */
	public static readonly isLocalEnv: boolean		= true;

	/** Indicates whether this is our Tor site. */
	public static readonly isOnion: boolean			=
		locationData.host.split('.').slice(-1)[0] === 'onion'
	;

	/** URL for backend API ("https://api.cyph.com/" or equivalent). */
	public static readonly baseUrl: string			= EnvDeploy.isOnion ?
		`https://api.${Config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:42000/`
	;

	/** URL for Cyph website ("https://www.cyph.com/" or equivalent). */
	public static readonly homeUrl: string			= EnvDeploy.isOnion ?
		`https://www.${Config.onionRoot}/` :
		`${locationData.protocol}//${locationData.hostname}:42001/`
	;

	/** Base URL for a new cyph link ("https://cyph.im/" or equivalent). */
	public static readonly newCyphBaseUrl: string	= customBuild ?
		`https://${customBuild}/` :
		`${locationData.protocol}//${locationData.hostname}:42002/`
	;

	/** URL for starting a new cyph (same as newCyphBaseUrl except on Onion site). */
	public static readonly newCyphUrl: string		= EnvDeploy.isOnion && !customBuild ?
		`https://im.${Config.onionRoot}/` :
		EnvDeploy.newCyphBaseUrl
	;

	/** Base URL for Cyph account application ("https://cyph.io/" or equivalent). */
	public static readonly cyphMeBaseUrl: string	= customBuild ?
		`${EnvDeploy.newCyphBaseUrl}#me/` : 
		`CYPH-ME/`
	;

	/** URL for Cyph account application (same as cyphMeBaseUrl except on Onion site). */
	public static readonly cyphMeUrl: string		= EnvDeploy.isOnion && !customBuild ?
		`https://me.${Config.onionRoot}/` :
		EnvDeploy.cyphMeBaseUrl
	;

	/** Base URL for a new file transfer cyph link ("https://cyph.io/" or equivalent). */
	public static readonly cyphIoBaseUrl: string	= customBuild ?
		`${EnvDeploy.newCyphBaseUrl}#io/` : 
		`CYPH-IO/`
	;

	/** URL for starting a new file transfer cyph (same as cyphIoBaseUrl except on Onion site). */
	public static readonly cyphIoUrl: string		= EnvDeploy.isOnion && !customBuild ?
		`https://io.${Config.onionRoot}/` :
		EnvDeploy.cyphIoBaseUrl
	;

	/** Base URL for a new video cyph link ("https://cyph.video/" or equivalent). */
	public static readonly cyphVideoBaseUrl: string	= customBuild ?
		`${EnvDeploy.newCyphBaseUrl}#video/` : 
		`CYPH-VIDEO/`
	;

	/** URL for starting a new video cyph (same as cyphVideoBaseUrl except on Onion site). */
	public static readonly cyphVideoUrl: string		= EnvDeploy.isOnion && !customBuild ?
		`https://video.${Config.onionRoot}/` :
		EnvDeploy.cyphVideoBaseUrl
	;

	/** Base URL for a new audio cyph link ("https://cyph.audio/" or equivalent). */
	public static readonly cyphAudioBaseUrl: string	= customBuild ?
		`${EnvDeploy.newCyphBaseUrl}#audio/` : 
		`CYPH-AUDIO/`
	;

	/** URL for starting a new audio cyph (same as cyphAudioBaseUrl except on Onion site). */
	public static readonly cyphAudioUrl: string		= EnvDeploy.isOnion && !customBuild ?
		`https://audio.${Config.onionRoot}/` :
		EnvDeploy.cyphAudioBaseUrl
	;

	/** Endpoint for Firebase server. */
	public static readonly firebaseEndpoint: string	= `ws://127.0.1:44000`;

	/** Content Security Policy defined in shared/csp. */
	public static readonly CSP: string				= "DEFAULT_CSP";
}
