/// <reference path="../../global/base.ts" />


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

			public id: string;
			public index: number;
			public total: number;

			public constructor (id: string, index: number, total: number, messageChunk: string) {
				this.id				= id;
				this.index			= index;
				this.total			= total;
				this.messageChunk	= OTRMessageInner.pad(messageChunk);
			}

			public toString () : string {
				return OTRMessageInner.unpad(this.messageChunk);
			}
		}

		export class OTRMessageOuter {
			public id: number;
			public cyphertext: string;

			public constructor (id: number, cyphertext: string) {
				this.id			= id;
				this.cyphertext	= cyphertext;
			}
		}
	}
}
