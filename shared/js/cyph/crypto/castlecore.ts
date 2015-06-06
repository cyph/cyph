module Cyph {
	export module Crypto {
		/**
		 * The Castle encryption protocol. This version supports an OTR-like
		 * feature set, with group/async/persistence coming later.
		 */
		export class CastleCore {
			private static sodium: any	= self['sodium'];
			private static ntru: any	= self['ntru'];

			private static publicKeySetLength: number		=
				CastleCore.sodium.crypto_box_PUBLICKEYBYTES +
				CastleCore.ntru.publicKeyLength
			;

			private static ntruPlaintextLength: number		=
				CastleCore.sodium.crypto_secretbox_KEYBYTES +
				CastleCore.sodium.crypto_onetimeauth_KEYBYTES
			;

			private static ntruMacIndex: number				=
				CastleCore.sodium.crypto_secretbox_NONCEBYTES +
				CastleCore.ntru.encryptedDataLength
			;

			private static sodiumCyphertextIndex: number	=
				CastleCore.ntruMacIndex +
				CastleCore.sodium.crypto_onetimeauth_BYTES
			;

			private static errors	= {
				ntruAuthFailure: new Error('Invalid NTRU cyphertext.'),
				decryptionFailure: new Error('Data could not be decrypted.')
			};


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

				try {
					/* Send invalid cyphertext to trigger
						friend's abortion logic */
					this.handlers.send('');
				}
				finally {
					this.handlers.abort();
				}
			}

			private decrypt (
				nonce: Uint8Array,
				asymmetricNonce: Uint8Array,
				ntruCyphertext: Uint8Array,
				ntruMac: Uint8Array,
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
				const ntruPlaintext: Uint8Array	= CastleCore.ntru.decrypt(
					ntruCyphertext,
					keySet.ntru.privateKey
				);

				const symmetricKey: Uint8Array	= new Uint8Array(
					ntruPlaintext.buffer,
					0,
					CastleCore.sodium.crypto_secretbox_KEYBYTES
				);

				const ntruAuthKey: Uint8Array	= new Uint8Array(
					ntruPlaintext.buffer,
					CastleCore.sodium.crypto_secretbox_KEYBYTES,
					CastleCore.sodium.crypto_onetimeauth_KEYBYTES
				);

				try {
					if (!CastleCore.sodium.crypto_onetimeauth_verify(
						ntruMac,
						ntruCyphertext,
						ntruAuthKey
					)) {
						throw CastleCore.errors.ntruAuthFailure;
					}

					return CastleCore.sodium.crypto_box_open_easy(
						CastleCore.sodium.crypto_secretbox_open_easy(
							sodiumCyphertext,
							nonce,
							symmetricKey
						),
						asymmetricNonce,
						friendKeySet.sodium,
						keySet.sodium.privateKey
					);
				}
				finally {
					CastleCore.sodium.memzero(ntruPlaintext);
				}
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

				const ntruAuthKey: Uint8Array		= CastleCore.sodium.randombytes_buf(
					CastleCore.sodium.crypto_onetimeauth_KEYBYTES
				);

				const ntruPlaintext: Uint8Array		= new Uint8Array(
					CastleCore.ntruPlaintextLength
				);

				ntruPlaintext.set(symmetricKey);
				ntruPlaintext.set(ntruAuthKey, CastleCore.sodium.crypto_secretbox_KEYBYTES);


				const ntruCyphertext: Uint8Array	= CastleCore.ntru.encrypt(
					ntruPlaintext,
					friendKeySet.ntru
				);

				const ntruMac: Uint8Array			= CastleCore.sodium.crypto_onetimeauth(
					ntruCyphertext,
					ntruAuthKey
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

				const cyphertext: Uint8Array		= new Uint8Array(
					CastleCore.sodiumCyphertextIndex +
					sodiumCyphertext.length
				);

				cyphertext.set(nonce);
				cyphertext.set(ntruCyphertext, CastleCore.sodium.crypto_secretbox_NONCEBYTES);
				cyphertext.set(ntruMac, CastleCore.ntruMacIndex);
				cyphertext.set(sodiumCyphertext, CastleCore.sodiumCyphertextIndex);

				try {
					return CastleCore.sodium.to_base64(cyphertext);
				}
				finally {
					CastleCore.sodium.memzero(nonce);
					CastleCore.sodium.memzero(symmetricKey);
					CastleCore.sodium.memzero(ntruAuthKey);
					CastleCore.sodium.memzero(ntruPlaintext);
					CastleCore.sodium.memzero(ntruCyphertext);
					CastleCore.sodium.memzero(ntruMac);
					CastleCore.sodium.memzero(sodiumCyphertext);
					CastleCore.sodium.memzero(cyphertext);
				}
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

				const publicKeySet: Uint8Array	= new Uint8Array(
					CastleCore.publicKeySetLength
				);

				publicKeySet.set(this.keySets[0].sodium.publicKey);
				publicKeySet.set(
					this.keySets[0].ntru.publicKey,
					CastleCore.sodium.crypto_box_PUBLICKEYBYTES
				);

				return publicKeySet;
			}

			private importFriendKeySet (data: Uint8Array, startIndex: number = 0) : void {
				this.friendKeySets.unshift({
					sodium: new Uint8Array(
						data.buffer,
						startIndex,
						CastleCore.sodium.crypto_box_PUBLICKEYBYTES
					),
					ntru: new Uint8Array(
						data.buffer,
						CastleCore.sodium.crypto_box_PUBLICKEYBYTES + startIndex,
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
			 * @returns Whether message was successfully decrypted.
			 */
			public receive (message: string) : boolean {
				if (this.isAborted) {
					return false;
				}

				const cyphertext: Uint8Array	= CastleCore.sodium.from_base64(message);

				if (this.friendKeySets.length < 1) {
					try {
						this.importFriendKeySet(
							CastleCore.sodium.crypto_secretbox_open_easy(
								cyphertext,
								new Uint8Array(
									CastleCore.sodium.crypto_secretbox_NONCEBYTES
								),
								this.sharedSecret
							)
						);

						/* Trigger friend's connection acknowledgement logic
							by sending this user's first encrypted message */
						this.send('');

						return true;
					}
					catch (_) {
						this.abort();
					}
					finally {
						CastleCore.sodium.memzero(this.sharedSecret);
						CastleCore.sodium.memzero(cyphertext);
					}
				}
				else {
					try {
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

						const ntruMac: Uint8Array			= new Uint8Array(
							cyphertext.buffer,
							CastleCore.ntruMacIndex,
							CastleCore.sodium.crypto_onetimeauth_BYTES
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
											ntruMac,
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

						CastleCore.sodium.memzero(cyphertext);

						if (!data) {
							throw CastleCore.errors.decryptionFailure;
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

						const message: Uint8Array	= new Uint8Array(
							data.buffer,
							messageIndex
						);

						try {
							if (data.length > messageIndex) {
								this.handlers.receive(
									CastleCore.sodium.to_string(
										message
									)
								);
							}
						}
						finally {
							CastleCore.sodium.memzero(message);
						}

						if (!this.isConnected) {
							this.isConnected	= true;
							this.handlers.connect();
						}

						return true;
					}
					catch (_) {
						if (!this.isConnected) {
							this.abort();
						}
					}
				}

				return false;
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

				try {
					this.handlers.send(this.encrypt(data, keySet));
				}
				finally {
					CastleCore.sodium.memzero(messageBytes);
					CastleCore.sodium.memzero(data);

					if (publicKeySet) {
						CastleCore.sodium.memzero(publicKeySet);
					}
				}
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

				const publicKeySet: Uint8Array	= this.generateKeySet();

				try {
					this.handlers.send(
						CastleCore.sodium.crypto_secretbox_easy(
							publicKeySet,
							new Uint8Array(
								CastleCore.sodium.crypto_secretbox_NONCEBYTES
							),
							this.sharedSecret,
							'base64'
						)
					);
				}
				finally {
					CastleCore.sodium.memzero(publicKeySet);
				}
			}
		}
	}
}
