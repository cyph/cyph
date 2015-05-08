module Cyph.im {
	/**
	 * Static/constant configuration values.
	 */
	export class Config {
		/** Number of seconds before new cyph wait screen will abort. */
		public static newCyphCountdown: number	= 600;

		/** Known good hashes of cyph.im's WebSign bootstrap. */
		public static webSignHashes	= {
			'2bc65ee1082f94261c9127ad765d4b670d24ca321222e638cf4409e325218828c5732f7c8e76d2f229ebdab6c95a30510cd2d73425699ef860d527a06c5e69ae':
				true,
			'85477981ccd7f019eb52a8bb8f9be2668cf4cd0e19ec6450b3d00916bad1d752eedb0e9488160aae4e90df129b109d56ac49c34795b9b4994f071f484028abf0':
				true,
			'0b12302d910309849d8c1ce8a931886d3b9536c81b5598cd27c176a7ce34123247f1faa484a62d42470d3a5dd7c7177a5bd0905ced9e3fe06d2aade97724fcd3':
				true,
			'5829995351b4900ae4a3426022c0c13844ad4e9f642f1e4b4b69f9ac4d265c40f8f369a2a2b99f1cb31f0aed944dbeefc297cff815f7db0e88733929be2794c8':
				true,
			'957a0b1ceb6014320764e0fdc3b6dca69266474dbb1bbb2080f6da90d2a0d85d79a92e71c8b6151137711806c2304d5857f39e0abfbacdac298e1095fd772539':
				true,
			'2f8acbd0eef6115a6ff52351e7c1325f98e447922ec43fefd9e14b4490b2b2679762693f9384795f55349ffabb3718a812c4d2ad9f16d470e70911cbb6c18b37':
				true,
			'561e07bbf7af1b767e7c28a8285b633637c68dac4b511ab1235f1bc777c883185d6db7742fed2b8f3df5ad6b205f4a8e14fd8b66bce88a0f564dabd7ed68b875':
				true,
			'9bbf9dce9a5adf6b2678c9dc8cd107eb1de04e96ecafeb743b9440c76c90f833cc2431840f3b504fc0ab46e0530cd2ed166aa522cd6e8a9768980b36d42c3edf':
				true
		};
	}
}
