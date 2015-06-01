module Cyph {
	export module Crypto {
		/**
		 * The Castle encryption protocol. This version includes an OTR-like
		 * feature set, with group/async/persistence coming later.
		 */
		export class CastleCore {
			private static sodium: any	= self['sodium'];

			private static emptyNonce: Uint8Array	= new Uint8Array(
				CastleCore.sodium.crypto_secretbox_NONCEBYTES
			);

			private static emptySalt: Uint8Array	= new Uint8Array(
				CastleCore.sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES
			);


			private isAborted: boolean			= false;
			private isConnected: boolean		= false;
			private shouldRatchetKeys: boolean	= true;
			private currentFriendKey: string	= '';
			private currentKey: string			= '';

			private friendKeys: Uint8Array[]	= [];
			private keyPairs: { publicKey: Uint8Array; privateKey: Uint8Array; }[]	= [];

			private abort () : void {
				this.isAborted		= true;
				this.isConnected	= false;

				this.handlers.abort();
			}

			private generateKeyPair () : Uint8Array {
				this.keyPairs.unshift(CastleCore.sodium.crypto_box_keypair());

				if (this.keyPairs.length > 2) {
					const oldKeyPair	= this.keyPairs.pop();

					CastleCore.sodium.memzero(oldKeyPair.privateKey);
					CastleCore.sodium.memzero(oldKeyPair.publicKey);
				}

				const publicKey: Uint8Array	= this.keyPairs[0].publicKey;
				this.currentKey				= CastleCore.sodium.to_hex(publicKey);

				return publicKey;
			}

			/**
			 * Receive incoming cyphertext.
			 * @param message Data to be decrypted.
			 */
			public receive (message: string) : void {
				if (this.isAborted) {
					return;
				}

				if (this.friendKeys.length < 1) {
					try {
						this.friendKeys.unshift(
							CastleCore.sodium.crypto_secretbox_open_easy(
								CastleCore.sodium.from_hex(message),
								CastleCore.emptyNonce,
								CastleCore.sodium.crypto_pwhash_scryptsalsa208sha256(
									this.sharedSecret,
									CastleCore.emptySalt,
									0,
									0,
									CastleCore.sodium.crypto_secretbox_KEYBYTES
								)
							)
						);

						this.send('');
					}
					catch (_) {
						this.abort();
						this.handlers.send('');
					}

					this.sharedSecret	= '';
				}
				else {
					try {
						const cyphertextData: { nonce: string; cyphertext: string; }	=
							JSON.parse(message)
						;

						const nonce: Uint8Array			= CastleCore.sodium.from_hex(
							cyphertextData.nonce
						);

						const cyphertext: Uint8Array	= CastleCore.sodium.from_hex(
							cyphertextData.cyphertext
						);

						const data: {
							message: string;
							friendKey: string;
							newKey: string;
						}	= (() => {
							for (const friendKey of this.friendKeys) {
								for (const keyPair of this.keyPairs) {
									try {
										return JSON.parse(
											CastleCore.sodium.crypto_box_open_easy(
												cyphertext,
												nonce,
												friendKey,
												keyPair.privateKey,
												'text'
											)
										);
									}
									catch (_) {}
								}
							}

							return {};
						})();

						if (data.newKey) {
							this.currentFriendKey	= data.newKey;

							this.friendKeys.unshift(CastleCore.sodium.from_hex(this.currentFriendKey));

							if (this.friendKeys.length > 2) {
								const oldKey	= this.friendKeys.pop();
								CastleCore.sodium.memzero(oldKey);
							}
						}

						if (data.friendKey === this.currentKey) {
							this.shouldRatchetKeys	= true;
						}

						if (data.message) {
							this.handlers.receive(data.message);
						}

						if (!this.isConnected) {
							this.isConnected	= true;
							this.handlers.connect();
						}
					}
					catch (_) {
						if (!this.isConnected) {
							this.abort();
						}
					}
				}
			}

			/**
			 * Send outgoing text.
			 * @param message Data to be encrypted.
			 */
			public send (message: string) : void {
				const privateKey: Uint8Array	= this.keyPairs[0].privateKey;

				const nonce: Uint8Array			= CastleCore.sodium.randombytes_buf(
					CastleCore.sodium.crypto_secretbox_NONCEBYTES
				);

				const data	= {
					message,
					friendKey: this.currentFriendKey,
					newKey: undefined
				};

				if (this.shouldRatchetKeys) {
					this.shouldRatchetKeys	= false;

					this.generateKeyPair();
					data.newKey	= this.currentKey;
				}

				this.handlers.send(JSON.stringify({
					nonce: CastleCore.sodium.to_hex(nonce),
					cyphertext: CastleCore.sodium.crypto_box_easy(
						JSON.stringify(data),
						nonce,
						this.friendKeys[0],
						privateKey,
						'hex'
					)
				}));
			}

			public constructor (
				private sharedSecret: string,
				private handlers: {
					abort: Function;
					connect: Function;
					receive: (message: string) => void;
					send: (message: string) => void;
				}
			) {
				this.handlers.send(
					CastleCore.sodium.crypto_secretbox_easy(
						this.generateKeyPair(),
						CastleCore.emptyNonce,
						CastleCore.sodium.crypto_pwhash_scryptsalsa208sha256(
							this.sharedSecret,
							CastleCore.emptySalt,
							0,
							0,
							CastleCore.sodium.crypto_secretbox_KEYBYTES
						),
						'hex'
					)
				);
			}
		}
	}
}
