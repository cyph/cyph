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


			private keySets: {
				sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
				ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
			}[]	= [];

			private friendKeySet: {
				sodium: Uint8Array;
				ntru: Uint8Array;
			};

			private isAborted: boolean;
			private isConnected: boolean;
			private shouldRatchetKeys: boolean;
			private sharedSecret: Uint8Array;

			private abort () : void {
				this.isAborted	= true;

				try {
					/* Send invalid cyphertext to trigger
						friend's abortion logic */
					this.handlers.send('');
				}
				finally {
					this.handlers.abort();
				}
			}

			private decrypt (cyphertext: Uint8Array) : {
				data: Uint8Array;
				keySet: {
					sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
					ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
				};
			} {
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


				for (const keySet of this.keySets) {
					let ntruPlaintext: Uint8Array;

					try {
						ntruPlaintext	= CastleCore.ntru.decrypt(
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

						if (!CastleCore.sodium.crypto_onetimeauth_verify(
							ntruMac,
							ntruCyphertext,
							ntruAuthKey
						)) {
							throw CastleCore.errors.ntruAuthFailure;
						}

						return {
							data: CastleCore.sodium.crypto_box_open_easy(
								CastleCore.sodium.crypto_secretbox_open_easy(
									sodiumCyphertext,
									nonce,
									symmetricKey
								),
								asymmetricNonce,
								this.friendKeySet.sodium,
								keySet.sodium.privateKey
							),
							keySet
						};
					}
					catch (err) {
						if (err === CastleCore.errors.ntruAuthFailure) {
							throw err;
						}
					}
					finally {
						if (ntruPlaintext) {
							CastleCore.sodium.memzero(ntruPlaintext);
						}
					}
				}

				throw CastleCore.errors.decryptionFailure;
			}

			private encrypt (
				data: Uint8Array,
				keySet: {
					sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
					ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
				}
			) : string {
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
					this.friendKeySet.ntru
				);

				const ntruMac: Uint8Array			= CastleCore.sodium.crypto_onetimeauth(
					ntruCyphertext,
					ntruAuthKey
				);

				const sodiumCyphertext: Uint8Array	= CastleCore.sodium.crypto_secretbox_easy(
					CastleCore.sodium.crypto_box_easy(
						data,
						asymmetricNonce,
						this.friendKeySet.sodium,
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
				this.friendKeySet.sodium.set(new Uint8Array(
					data.buffer,
					startIndex,
					CastleCore.sodium.crypto_box_PUBLICKEYBYTES
				));

				this.friendKeySet.ntru.set(new Uint8Array(
					data.buffer,
					CastleCore.sodium.crypto_box_PUBLICKEYBYTES + startIndex,
					CastleCore.ntru.publicKeyLength
				));
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

				let cyphertext: Uint8Array;

				try {
					cyphertext	= CastleCore.sodium.from_base64(message);

					/* Initial key exchange */
					if (!this.friendKeySet) {
						this.friendKeySet	= {
							sodium: new Uint8Array(CastleCore.sodium.crypto_box_PUBLICKEYBYTES),
							ntru: new Uint8Array(CastleCore.ntru.publicKeyLength)
						};

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
						}
						finally {
							CastleCore.sodium.memzero(this.sharedSecret);
						}

						/* Trigger friend's connection acknowledgement logic
							by sending this user's first encrypted message */
						this.send('');

						return true;
					}

					/* Standard incoming message */
					else {
						const decrypted	= this.decrypt(cyphertext);

						if (decrypted.keySet === this.keySets[0]) {
							this.shouldRatchetKeys	= true;
						}

						let messageIndex: number	= 1;

						/* Flag for new key set */
						if (decrypted.data[0] === 1) {
							this.importFriendKeySet(decrypted.data, 1);
							messageIndex += CastleCore.publicKeySetLength;
						}

						try {
							if (decrypted.data.length > messageIndex) {
								this.handlers.receive(
									CastleCore.sodium.to_string(
										new Uint8Array(
											decrypted.data.buffer,
											messageIndex
										)
									)
								);
							}
						}
						finally {
							CastleCore.sodium.memzero(decrypted.data);
						}

						if (!this.isConnected) {
							this.isConnected	= true;
							this.handlers.connect();
						}

						return true;
					}
				}
				catch (_) {
					if (!this.isConnected) {
						this.abort();
					}
				}
				finally {
					if (cyphertext) {
						CastleCore.sodium.memzero(cyphertext);
					}
				}

				return false;
			}

			/**
			 * Send outgoing text.
			 * @param message Data to be encrypted.
			 */
			public send (message: string) : void {
				const keySet	= this.keySets[0];

				let publicKeySet: Uint8Array;
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
					CastleCore.sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
					CastleCore.sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE,
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
