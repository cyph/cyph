/**
 * Indicates which Pro features are required by the current Cyph instance
 * using a data model consistent with the server's.
 */
export class ProFeatures {
	constructor (
		/** @see ISession.state.wasInitiatedByAPI */
		public readonly api: boolean = false,

		/** @see ISessionService.apiFlags.disableP2P */
		public readonly disableP2P: boolean = false,

		/** @see ISessionService.apiFlags.modestBranding */
		public readonly modestBranding: boolean = false,

		/** True if SessionInitService.callType is set to video. */
		public readonly video: boolean = false,

		/** True if SessionInitService.callType is set to audio. */
		public readonly voice: boolean = false
	) {}
}
