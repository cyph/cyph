module Cyph {
	export module Crypto {
		/**
		 * Message body to be encrypted within Castle cyphertext.
		 * Contains metadata to ensure that large messages split across
		 * multiple cyphertext blocks are correctly pieced together.
		 */
		export class CastleMessageInner {
			/**
			 * @param id Random unique ID.
			 * @param index Number designating the contained message chunk's position
			 * within the sequence of chunks associated with this message.
			 * @param total Total number of chunks associated with this message.
			 * @param messageChunk Block of plaintext data.
			 */
			public constructor (
				public id: string,
				public index: number,
				public total: number,
				public messageChunk: string
			) {}
		}
	}
}
