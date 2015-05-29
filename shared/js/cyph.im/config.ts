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
			'28fc6b09f3b33ef66fc7d7b4ba67ed77b263abafc07508bc28f46a5d09a81e90': true,
			'60099561b769e4f3f6f258f5a3f68ac0e5a285d11f818711b2d7da5f9043a2ea': true,
			'3c2d033cf0538e22f9faa7c7d29c42537f77f7340e8e291a66dfe41655b2f9aa': true
		};
	}
}
