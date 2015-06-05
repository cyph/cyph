module Cyph {
	export module Crypto {
		/**
		 * The Castle encryption protocol. This version includes an OTR-like
		 * feature set, with group/async/persistence coming later.
		 */
		export class CastleCore {
			private static sodium: any	= self['sodium'];
			private static ntru: any	= self['ntru'];

			private static publicKeySetLength: number	=
				CastleCore.sodium.crypto_box_PUBLICKEYBYTES +
				CastleCore.ntru.publicKeyLength
			;

			private static sodiumCyphertextIndex: number	=
				CastleCore.sodium.crypto_secretbox_NONCEBYTES +
				CastleCore.ntru.encryptedDataLength
			;


			private isAborted: boolean			= false;
			private isConnected: boolean		= false;
			private shouldRatchetKeys: boolean	= true;

			private friendKeySets: {
				sodium: Uint8Array;
				ntru: Uint8Array;
			}[]	= [];

			private keySets: {
				sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
				ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
			}[]	= [];

			private sharedSecret: Uint8Array;

			private abort () : void {
				this.isAborted		= true;
				this.isConnected	= false;

				this.handlers.abort();
				this.handlers.send('');
			}

			private decrypt(
				nonce: Uint8Array,
				asymmetricNonce: Uint8Array,
				ntruCyphertext: Uint8Array,
				sodiumCyphertext: Uint8Array,
				friendKeySet: {
					sodium: Uint8Array;
					ntru: Uint8Array;
				},
				keySet: {
					sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
					ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
				}
			) : Uint8Array {
				return CastleCore.sodium.crypto_box_open_easy(
					CastleCore.sodium.crypto_secretbox_open_easy(
						sodiumCyphertext,
						nonce,
						CastleCore.ntru.decrypt(
							ntruCyphertext,
							keySet.ntru.privateKey
						)
					),
					asymmetricNonce,
					friendKeySet.sodium,
					keySet.sodium.privateKey
				);
			}

			private encrypt (
				data: Uint8Array,
				keySet: {
					sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
					ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
				}
			) : string {
				const friendKeySet	= this.friendKeySets[0];

				const nonce: Uint8Array				= CastleCore.sodium.randombytes_buf(
					CastleCore.sodium.crypto_secretbox_NONCEBYTES
				);

				const asymmetricNonce: Uint8Array	= new Uint8Array(
					nonce.buffer,
					0,
					CastleCore.sodium.crypto_box_NONCEBYTES
				);

				const symmetricKey: Uint8Array		= CastleCore.sodium.randombytes_buf(
					CastleCore.sodium.crypto_secretbox_KEYBYTES
				);

				const ntruCyphertext: Uint8Array	= CastleCore.ntru.encrypt(
					symmetricKey,
					friendKeySet.ntru
				);

				const sodiumCyphertext: Uint8Array	= CastleCore.sodium.crypto_secretbox_easy(
					CastleCore.sodium.crypto_box_easy(
						data,
						asymmetricNonce,
						friendKeySet.sodium,
						keySet.sodium.privateKey
					),
					nonce,
					symmetricKey
				);

				const cyphertext: Uint8Array	= new Uint8Array(
					CastleCore.sodiumCyphertextIndex +
					sodiumCyphertext.length
				);

				cyphertext.set(nonce);
				cyphertext.set(ntruCyphertext, nonce.length);
				cyphertext.set(sodiumCyphertext, CastleCore.sodiumCyphertextIndex);

				return CastleCore.sodium.to_hex(cyphertext);
			}

			private generateKeySet () : Uint8Array {
				this.keySets.unshift({
					sodium: CastleCore.sodium.crypto_box_keypair(),
					ntru: CastleCore.ntru.keyPair()
				});

				if (this.keySets.length > 2) {
					const oldKeySet	= this.keySets.pop();

					CastleCore.sodium.memzero(oldKeySet.sodium.privateKey);
					CastleCore.sodium.memzero(oldKeySet.ntru.privateKey);
					CastleCore.sodium.memzero(oldKeySet.sodium.publicKey);
					CastleCore.sodium.memzero(oldKeySet.ntru.publicKey);
				}

				const sodiumKey: Uint8Array		= this.keySets[0].sodium.publicKey;
				const ntruKey: Uint8Array		= this.keySets[0].ntru.publicKey;

				const publicKeySet: Uint8Array	= new Uint8Array(
					CastleCore.publicKeySetLength
				);

				publicKeySet.set(sodiumKey);
				publicKeySet.set(ntruKey, sodiumKey.length);

				return publicKeySet;
			}

			private importFriendKeySet (friendKeySet: Uint8Array, start: number = 0) : void {
				this.friendKeySets.unshift({
					sodium: new Uint8Array(
						friendKeySet.buffer,
						start,
						CastleCore.sodium.crypto_box_PUBLICKEYBYTES
					),
					ntru: new Uint8Array(
						friendKeySet.buffer,
						CastleCore.sodium.crypto_box_PUBLICKEYBYTES + start,
						CastleCore.ntru.publicKeyLength
					)
				});

				if (this.friendKeySets.length > 2) {
					const oldKeySet	= this.friendKeySets.pop();

					CastleCore.sodium.memzero(oldKeySet.sodium);
					CastleCore.sodium.memzero(oldKeySet.ntru);
				}
			}

			/**
			 * Receive incoming cyphertext.
			 * @param message Data to be decrypted.
			 */
			public receive (message: string) : void {
				if (this.isAborted) {
					return;
				}

				if (this.friendKeySets.length < 1) {
					try {
						this.importFriendKeySet(
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
						const cyphertext: Uint8Array		= CastleCore.sodium.from_hex(message);

						const nonce: Uint8Array				= new Uint8Array(
							cyphertext.buffer,
							0,
							CastleCore.sodium.crypto_secretbox_NONCEBYTES
						);

						const asymmetricNonce: Uint8Array	= new Uint8Array(
							cyphertext.buffer,
							0,
							CastleCore.sodium.crypto_box_NONCEBYTES
						);

						const ntruCyphertext: Uint8Array	= new Uint8Array(
							cyphertext.buffer,
							CastleCore.sodium.crypto_secretbox_NONCEBYTES,
							CastleCore.ntru.encryptedDataLength
						);

						const sodiumCyphertext: Uint8Array	= new Uint8Array(
							cyphertext.buffer,
							CastleCore.sodiumCyphertextIndex
						);


						let keySetUsed;

						const data: Uint8Array	= (() => {
							for (const friendKeySet of this.friendKeySets) {
								for (const keySet of this.keySets) {
									try {
										const data	= this.decrypt(
											nonce,
											asymmetricNonce,
											ntruCyphertext,
											sodiumCyphertext,
											friendKeySet,
											keySet
										);

										keySetUsed	= keySet;

										return data;
									}
									catch (_) {}
								}
							}
						})();

						if (!data) {
							throw new Error('Data could not be decrypted.');
						}

						if (keySetUsed === this.keySets[0]) {
							this.shouldRatchetKeys	= true;
						}

						let messageIndex: number	= 1;

						/* Flag for new key set */
						if (data[0] === 1) {
							this.importFriendKeySet(data, 1);
							messageIndex += CastleCore.publicKeySetLength;
						}

						if (data.length > messageIndex) {
							this.handlers.receive(
								CastleCore.sodium.to_string(
									new Uint8Array(
										data.buffer,
										messageIndex
									)
								)
							);
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
				let publicKeySet;
				const keySet				= this.keySets[0];
				let messageIndex: number	= 1;

				if (this.shouldRatchetKeys) {
					this.shouldRatchetKeys	= false;
					publicKeySet			= this.generateKeySet();
					messageIndex += CastleCore.publicKeySetLength;
				}

				const messageBytes: Uint8Array	=
					CastleCore.sodium.from_string(message)
				;

				const data: Uint8Array	= new Uint8Array(
					messageBytes.length +
					messageIndex
				);

				if (publicKeySet) {
					data[0]	= 1;
					data.set(publicKeySet, 1);
				}

				data.set(messageBytes, messageIndex);

				this.handlers.send(this.encrypt(data, keySet));
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
						this.generateKeySet(),
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
