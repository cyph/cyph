module Cyph.im {
	/**
	 * Static/constant configuration values.
	 */
	export class Config {
		/** Number of seconds before new cyph wait screen will abort. */
		public static newCyphCountdown: number	= 600;

		/** Known good hashes of cyph.im's WebSign bootstrap. */
		public static webSignHashes	= {
			'720e42f34e21f6409996ced5a97de214419f8b308d4d29ba551db938bf7e59bb': true,
			'0375db1d39ed4ad098b90d1104f094cfbc4723786f92b58728a630674c487f4f': true,
			'2330cd9327b6cf2cdfa4c26086a7d397faee3b1c453c3a2f9763e8f16014fa3a': true,
			'83528ddf88629be5b12963315ebf0cb480ebb0ae860aabcab078615343d5b6f4': true
		};
	}
}
