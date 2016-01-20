module Cyph {
	/**
	 * Subset of Env that gets modified by find/replace statements in
	 * the deploy script; exercise EXTREME caution when modifying this file.
	 */
	export class EnvDeploy {
		/** Indicates whether this is local dev environment. */
		public static isLocalEnv: boolean		= true;

		/** Indicates whether this is our Tor site. */
		public static isOnion: boolean			=
			locationData.host.split('.').slice(-1)[0] === 'onion'
		;

		/** URL for backend API ("https://api.cyph.com/" or equivalent). */
		public static baseUrl: string			= EnvDeploy.isOnion ?
			`https://api.${Config.onionRoot}/` :
			`${locationData.protocol}//${locationData.hostname}:42000/`
		;

		/** URL for Cyph website ("https://www.cyph.com/" or equivalent). */
		public static homeUrl: string			= EnvDeploy.isOnion ?
			`https://www.${Config.onionRoot}/` :
			`${locationData.protocol}//${locationData.hostname}:42001/`
		;

		/** Base URL for a new cyph link ("https://cyph.im/" or equivalent). */
		public static newCyphBaseUrl: string	= `${locationData.protocol}//${locationData.hostname}:42002/`;

		/** URL for starting a new cyph (same as newCyphBaseUrl except on Onion site). */
		public static newCyphUrl: string		= EnvDeploy.isOnion ?
			`https://im.${Config.onionRoot}/` :
			EnvDeploy.newCyphBaseUrl
		;

		/** URL for Cyph account application ("https://cyph.me/" or equivalent). */
		public static cyphMeUrl: string			= EnvDeploy.isOnion ?
			`https://me.${Config.onionRoot}/` :
			`${locationData.protocol}//${locationData.hostname}:42003/`
		;

		/** Base URL for a new video cyph link ("https://cyph.video/" or equivalent). */
		public static cyphVideoBaseUrl: string	= `${locationData.protocol}//${locationData.hostname}:42004/`;

		/** URL for starting a new video cyph (same as cyphVideoBaseUrl except on Onion site). */
		public static cyphVideoUrl: string		= EnvDeploy.isOnion ?
			`https://video.${Config.onionRoot}/` :
			EnvDeploy.cyphVideoBaseUrl
		;

		/** Correct endpoint for Fake SQS in local environments
			(replaces Config.awsEndpointFake). */
		public static awsEndpoint: string		= `${locationData.protocol}//${locationData.hostname}:43000`;

		/** Content Security Policy defined by WebSign in shared/websign/csp. */
		public static webSignCSP: string		= "DEFAULT_CSP";
	}
}
