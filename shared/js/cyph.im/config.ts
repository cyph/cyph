module Cyph.im {
	/**
	 * Static/constant configuration values.
	 */
	export class Config {
		/** Number of seconds before new cyph wait screen will abort. */
		public static newCyphCountdown: number	= 600;

		/** Known good hashes of cyph.im's WebSign bootstrap. */
		public static webSignHashes	= {
			'fd5a7adad3db30942214a6ad564d153bdde504c42b5f1fed5b37c9e8fe2e6952': true,
			'28fc6b09f3b33ef66fc7d7b4ba67ed77b263abafc07508bc28f46a5d09a81e90': true
		};
	}
}
