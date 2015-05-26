module Cyph.im {
	/**
	 * Static/constant configuration values.
	 */
	export class Config {
		/** Number of seconds before new cyph wait screen will abort. */
		public static newCyphCountdown: number	= 600;

		/** Known good hashes of cyph.im's WebSign bootstrap. */
		public static webSignHashes	= {
			'fd5a7adad3db30942214a6ad564d153bdde504c42b5f1fed5b37c9e8fe2e6952': true
		};
	}
}
