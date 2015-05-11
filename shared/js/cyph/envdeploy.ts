module Cyph {
	/**
	 * Subset of Env that gets modified by find/replace statements in
	 * the deploy script; exercise EXTREME caution when modifying this file.
	 */
	export class EnvDeploy {
		/** Indicates whether this is local dev environment. */
		public static isLocalEnv: boolean	= true;

		/** Indicates whether this is our Tor site. */
		public static isOnion: boolean		=
			!!location && location.host.split('.').slice(-1)[0] === 'onion'
		;

		/** URL for backend API ("https://api.cyph.com/" or equivalent). */
		public static baseUrl: string		= EnvDeploy.isOnion ?
			'/api/' :
			`${location.protocol}//${location.hostname}:42000/`
		;

		/** URL for Cyph website ("https://www.cyph.com/" or equivalent). */
		public static homeUrl: string		= EnvDeploy.isOnion ?
			'/' :
			`${location.protocol}//${location.hostname}:42001/`
		;

		/** URL for starting a new cyph ("https://www.cyph.im/" or equivalent). */
		public static newCyphUrl: string	= EnvDeploy.isOnion ?
			`${Config.onionUrl}im/` :
			`${location.protocol}//${location.hostname}:42002/`
		;

		/** URL for Cyph account application ("https://www.cyph.me/" or equivalent). */
		public static cyphMeUrl: string		= EnvDeploy.isOnion ?
			`${Config.onionUrl}me/` :
			`${location.protocol}//${location.hostname}:42003/`
		;

		/** Correct endpoint for Fake SQS in local environments
			(replaces Config.awsEndpointFake). */
		public static awsEndpoint: string	= `${location.protocol}//${location.hostname}:43000`;
	}
}
