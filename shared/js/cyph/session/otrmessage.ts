module Cyph {
	export module Session {
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

			public toString () : string {
				return OTRMessageInner.unpad(this.messageChunk);
			}

			public constructor (
				public id: string,
				public index: number,
				public total: number,
				messageChunk: string
			) {
				this.messageChunk	= OTRMessageInner.pad(messageChunk);
			}
		}

		export class OTRMessageOuter {
			public constructor (
				public id: number,
				public cyphertext: string
			) {}
		}
	}
}
