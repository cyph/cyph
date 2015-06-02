module Cyph {
	export module Crypto {
		/**
		 * The Castle encryption protocol. This version includes an OTR-like
		 * feature set, with group/async/persistence coming later.
		 */
		export class CastleCore {
			private static sodium: any	= self['sodium'];


			private isAborted: boolean			= false;
			private isConnected: boolean		= false;
			private shouldRatchetKeys: boolean	= true;

			private friendKeys: Uint8Array[]	= [];
			private keyPairs: { publicKey: Uint8Array; privateKey: Uint8Array; }[]	= [];

			private sharedSecret: Uint8Array;

			private abort () : void {
				this.isAborted		= true;
				this.isConnected	= false;

				this.handlers.send('');
				this.handlers.abort();
			}

			private generateKeyPair () : Uint8Array {
				this.keyPairs.unshift(CastleCore.sodium.crypto_box_keypair());

				if (this.keyPairs.length > 2) {
					const oldKeyPair	= this.keyPairs.pop();

					CastleCore.sodium.memzero(oldKeyPair.privateKey);
					CastleCore.sodium.memzero(oldKeyPair.publicKey);
				}

				return this.keyPairs[0].publicKey;
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
								new Uint8Array(
									CastleCore.sodium.crypto_secretbox_NONCEBYTES
								),
								this.sharedSecret
							)
						);

						this.send('');
					}
					catch (_) {
						this.abort();
					}
					finally {
						CastleCore.sodium.memzero(this.sharedSecret);
					}
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


						let keyPairUsed: { publicKey: Uint8Array; privateKey: Uint8Array; };

						const data: {
							message: string;
							friendKey: string;
							newKey: string;
						}	= (() => {
							for (const friendKey of this.friendKeys) {
								for (const keyPair of this.keyPairs) {
									try {
										const data	= JSON.parse(
											CastleCore.sodium.crypto_box_open_easy(
												cyphertext,
												nonce,
												friendKey,
												keyPair.privateKey,
												'text'
											)
										);

										keyPairUsed	= keyPair;

										return data;
									}
									catch (_) {}
								}
							}
						})();

						if (!data) {
							throw data;
						}

						if (keyPairUsed === this.keyPairs[0]) {
							this.shouldRatchetKeys	= true;
						}

						if (data.newKey) {
							this.friendKeys.unshift(CastleCore.sodium.from_hex(data.newKey));

							if (this.friendKeys.length > 2) {
								CastleCore.sodium.memzero(this.friendKeys.pop());
							}
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
					newKey: undefined
				};

				if (this.shouldRatchetKeys) {
					this.shouldRatchetKeys	= false;
					data.newKey	= CastleCore.sodium.to_hex(this.generateKeyPair());
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
				sharedSecret: string,
				private handlers: {
					abort: Function;
					connect: Function;
					receive: (message: string) => void;
					send: (message: string) => void;
				}
			) {
				this.sharedSecret	= CastleCore.sodium.crypto_pwhash_scryptsalsa208sha256(
					sharedSecret,
					new Uint8Array(
						CastleCore.sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES
					),
					0,
					0,
					CastleCore.sodium.crypto_secretbox_KEYBYTES
				);

				this.handlers.send(
					CastleCore.sodium.crypto_secretbox_easy(
						this.generateKeyPair(),
						new Uint8Array(
							CastleCore.sodium.crypto_secretbox_NONCEBYTES
						),
						this.sharedSecret,
						'hex'
					)
				);
			}
		}
	}
}
