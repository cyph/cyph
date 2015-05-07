module Cyph {
	export module Session {
		/**
		 * Message body to be encrypted within OTR cyphertext.
		 * Contains metadata to ensure that large messages split across
		 * multiple cyphertext blocks are correctly pieced together.
		 *
		 * Also transparently adds padding to ensure that the same message
		 * sent between key ratchets won't yield the same cyphertext.
		 */
		export class OTRMessageInner {
			private static paddingDelimiter: string	= '☁☁☁ PRAISE BE TO CYPH ☀☀☀';

			private static getPadding () : string {
				return Array.prototype.slice.call(
					crypto.getRandomValues(
						new Uint8Array(
							crypto.getRandomValues(new Uint8Array(1))[0] +
							100
						)
					)
				).join('');
			}

			private static pad (s: string) : string {
				return btoa(
					encodeURIComponent(
						OTRMessageInner.getPadding() +
						OTRMessageInner.paddingDelimiter +
						s +
						OTRMessageInner.paddingDelimiter +
						OTRMessageInner.getPadding()
					)
				);
			}

			private static unpad (s: string) : string {
				return decodeURIComponent(atob(s)).split(OTRMessageInner.paddingDelimiter)[1];
			}


			private messageChunk: string;

			/**
			 * Retuns the original message / message chunk.
			 */
			public toString () : string {
				return OTRMessageInner.unpad(this.messageChunk);
			}

			/**
			 * @param id
			 * @param index
			 * @param total
			 * @param messageChunk
			 */
			public constructor (
				public id: string,
				public index: number,
				public total: number,
				messageChunk: string
			) {
				this.messageChunk	= OTRMessageInner.pad(messageChunk);
			}
		}

		/**
		 * Wrapper around OTR cyphertext to be sent over the network;
		 * used to ensure that messages are processed only once and in order.
		 */
		export class OTRMessageOuter {
			/**
			 * @param id
			 * @param cyphertext
			 */
			public constructor (
				public id: number,
				public cyphertext: string
			) {}
		}
	}
}
