module Cyph {
	export module Crypto {
		/**
		 * Wrapper around Castle cyphertext to be sent over the network;
		 * used to ensure that messages are processed only once and in order.
		 */
		export class CastleMessageOuter {
			/**
			 * @param id Number designating order in sequence of messages.
			 * @param cyphertext Block of encrypted data.
			 */
			public constructor (
				public id: number,
				public cyphertext: string
			) {}
		}
	}
}
