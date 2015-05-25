module Cyph.im {
	/**
	 * Static/constant configuration values.
	 */
	export class Config {
		/** Number of seconds before new cyph wait screen will abort. */
		public static newCyphCountdown: number	= 600;

		/** Known good hashes of cyph.im's WebSign bootstrap. */
		public static webSignHashes	= {
			'720e42f34e21f6409996ced5a97de214419f8b308d4d29ba551db938bf7e59bb': true
		};
	}
}
