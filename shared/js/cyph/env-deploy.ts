/* tslint:disable */

import {environment} from '../environments';
import {config} from './config';
import {IEnvironment} from './proto';


/**
 * Subset of Env that gets modified by find/replace statements in
 * the deploy script; exercise EXTREME caution when modifying this file.
 */
export class EnvDeploy {
	/** @ignore */
	private readonly useBaseUrl: boolean		= !!environment.customBuild || environment.local;

	/** @see IEnvironment */
	public readonly environment: IEnvironment	= environment;

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
	public readonly newCyphBaseUrl: string		=
		this.environment.customBuild && !this.environment.local ?
			`https://${this.environment.customBuild.id}/` :
			`${locationData.protocol}//${locationData.hostname}:42002/`
	;

	/** URL for starting a new cyph ("https://cyph.im/" or equivalent). */
	public readonly newCyphUrl: string			= this.useBaseUrl ?
		this.newCyphBaseUrl :
		this.isOnion ?
			`https://im.${config.onionRoot}/` :
			`CYPH-IM/`
	;

	/** Base URL for an accounts link ("https://cyph.ws/#account/" or equivalent). */
	public readonly cyphMeBaseUrl: string		= `${this.newCyphBaseUrl}#account/`;

	/** URL for an accounts link ("https://cyph.me/" or equivalent). */
	public readonly cyphMeUrl: string			= this.useBaseUrl ?
		this.cyphMeBaseUrl :
		this.isOnion ?
			`https://me.${config.onionRoot}/` :
			`CYPH-ME/`
	;

	/** Base URL for a new io cyph link ("https://cyph.ws/#io/" or equivalent). */
	public readonly cyphIoBaseUrl: string		= `${this.newCyphBaseUrl}#io/`;

	/** URL for starting a new io cyph ("https://cyph.io/" or equivalent). */
	public readonly cyphIoUrl: string			= this.useBaseUrl ?
		this.cyphIoBaseUrl :
		this.isOnion ?
			`https://io.${config.onionRoot}/` :
			`CYPH-IO/`
	;

	/** Base URL for a new video cyph link ("https://cyph.ws/#video/" or equivalent). */
	public readonly cyphVideoBaseUrl: string	= `${this.newCyphBaseUrl}#video/`;

	/** URL for starting a new video cyph ("https://cyph.video/" or equivalent). */
	public readonly cyphVideoUrl: string		= this.useBaseUrl ?
		this.cyphVideoBaseUrl :
		this.isOnion ?
			`https://video.${config.onionRoot}/` :
			`CYPH-VIDEO/`
	;

	/** Base URL for a new audio cyph link ("https://cyph.ws/#audio/" or equivalent). */
	public readonly cyphAudioBaseUrl: string	= `${this.newCyphBaseUrl}#audio/`;

	/** URL for starting a new audio cyph ("https://cyph.audio/" or equivalent). */
	public readonly cyphAudioUrl: string		= this.useBaseUrl ?
		this.cyphAudioBaseUrl :
		this.isOnion ?
			`https://audio.${config.onionRoot}/` :
			`CYPH-AUDIO/`
	;

	/** Firebase-related config. */
	public readonly firebaseConfig				= {
		apiKey: environment.firebase.apiKey,
		authDomain: `${environment.firebase.project}.firebaseapp.com`,
		databaseURL: `wss://${environment.firebase.project}.firebaseio.com`, // `ws://${`${locationData.hostname}.`.replace(/(localhost|127\.0\.0\.1|0\.0\.0\.0)\.$/, '127.0.1')}:44000`,
		messagingSenderId: environment.firebase.messagingSenderId,
		projectId: environment.firebase.project,
		storageBucket: `${environment.firebase.project}.appspot.com`,
	};

	/** Content Security Policy defined in shared/csp. */
	public readonly CSP: string					= "DEFAULT_CSP";

	constructor () {}
}
