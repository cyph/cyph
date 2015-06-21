module Cyph {
	export module Crypto {
		/**
		 * The Castle encryption protocol. This version supports an OTR-like
		 * feature set, with group/async/persistence coming later.
		 */
		export class CastleCore {
			private static handshakeTimeout: number			= 45000;

			private static publicKeySetLength: number		=
				sodium.crypto_box_PUBLICKEYBYTES +
				ntru.publicKeyLength
			;

			private static ntruPlaintextLength: number		=
				sodium.crypto_secretbox_KEYBYTES +
				sodium.crypto_onetimeauth_KEYBYTES
			;

			private static ntruMacIndex: number				=
				sodium.crypto_secretbox_NONCEBYTES +
				ntru.encryptedDataLength
			;

			private static sodiumCyphertextIndex: number	=
				CastleCore.ntruMacIndex +
				sodium.crypto_onetimeauth_BYTES
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
					sodium.crypto_secretbox_NONCEBYTES
				);

				const asymmetricNonce: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					0,
					sodium.crypto_box_NONCEBYTES
				);

				const ntruCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					sodium.crypto_secretbox_NONCEBYTES,
					ntru.encryptedDataLength
				);

				const ntruMac: Uint8Array			= new Uint8Array(
					cyphertext.buffer,
					CastleCore.ntruMacIndex,
					sodium.crypto_onetimeauth_BYTES
				);

				const sodiumCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					CastleCore.sodiumCyphertextIndex
				);


				for (const keySet of this.keySets) {
					let ntruPlaintext: Uint8Array;

					try {
						ntruPlaintext	= ntru.decrypt(
							ntruCyphertext,
							keySet.ntru.privateKey
						);

						const symmetricKey: Uint8Array	= new Uint8Array(
							ntruPlaintext.buffer,
							0,
							sodium.crypto_secretbox_KEYBYTES
						);

						const ntruAuthKey: Uint8Array	= new Uint8Array(
							ntruPlaintext.buffer,
							sodium.crypto_secretbox_KEYBYTES,
							sodium.crypto_onetimeauth_KEYBYTES
						);

						if (!sodium.crypto_onetimeauth_verify(
							ntruMac,
							ntruCyphertext,
							ntruAuthKey
						)) {
							throw CastleCore.errors.ntruAuthFailure;
						}

						return {
							data: sodium.crypto_box_open_easy(
								sodium.crypto_secretbox_open_easy(
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
							sodium.memzero(ntruPlaintext);
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
				const nonce: Uint8Array				= sodium.randombytes_buf(
					sodium.crypto_secretbox_NONCEBYTES
				);

				const asymmetricNonce: Uint8Array	= new Uint8Array(
					nonce.buffer,
					0,
					sodium.crypto_box_NONCEBYTES
				);

				const symmetricKey: Uint8Array		= sodium.randombytes_buf(
					sodium.crypto_secretbox_KEYBYTES
				);

				const ntruAuthKey: Uint8Array		= sodium.randombytes_buf(
					sodium.crypto_onetimeauth_KEYBYTES
				);

				const ntruPlaintext: Uint8Array		= new Uint8Array(
					CastleCore.ntruPlaintextLength
				);

				ntruPlaintext.set(symmetricKey);
				ntruPlaintext.set(ntruAuthKey, sodium.crypto_secretbox_KEYBYTES);


				const ntruCyphertext: Uint8Array	= ntru.encrypt(
					ntruPlaintext,
					this.friendKeySet.ntru
				);

				const ntruMac: Uint8Array			= sodium.crypto_onetimeauth(
					ntruCyphertext,
					ntruAuthKey
				);

				const sodiumCyphertext: Uint8Array	= sodium.crypto_secretbox_easy(
					sodium.crypto_box_easy(
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
				cyphertext.set(ntruCyphertext, sodium.crypto_secretbox_NONCEBYTES);
				cyphertext.set(ntruMac, CastleCore.ntruMacIndex);
				cyphertext.set(sodiumCyphertext, CastleCore.sodiumCyphertextIndex);

				try {
					return sodium.to_base64(cyphertext);
				}
				finally {
					sodium.memzero(nonce);
					sodium.memzero(symmetricKey);
					sodium.memzero(ntruAuthKey);
					sodium.memzero(ntruPlaintext);
					sodium.memzero(ntruCyphertext);
					sodium.memzero(ntruMac);
					sodium.memzero(sodiumCyphertext);
					sodium.memzero(cyphertext);
				}
			}

			private generateKeySet () : Uint8Array {
				this.keySets.unshift({
					sodium: sodium.crypto_box_keypair(),
					ntru: ntru.keyPair()
				});

				if (this.keySets.length > 2) {
					const oldKeySet	= this.keySets.pop();

					sodium.memzero(oldKeySet.sodium.privateKey);
					sodium.memzero(oldKeySet.ntru.privateKey);
					sodium.memzero(oldKeySet.sodium.publicKey);
					sodium.memzero(oldKeySet.ntru.publicKey);
				}

				const publicKeySet: Uint8Array	= new Uint8Array(
					CastleCore.publicKeySetLength
				);

				publicKeySet.set(this.keySets[0].sodium.publicKey);
				publicKeySet.set(
					this.keySets[0].ntru.publicKey,
					sodium.crypto_box_PUBLICKEYBYTES
				);

				return publicKeySet;
			}

			private importFriendKeySet (data: Uint8Array, startIndex: number = 0) : void {
				this.friendKeySet.sodium.set(new Uint8Array(
					data.buffer,
					startIndex,
					sodium.crypto_box_PUBLICKEYBYTES
				));

				this.friendKeySet.ntru.set(new Uint8Array(
					data.buffer,
					sodium.crypto_box_PUBLICKEYBYTES + startIndex,
					ntru.publicKeyLength
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
					cyphertext	= sodium.from_base64(message);

					/* Initial key exchange */
					if (!this.friendKeySet) {
						this.friendKeySet	= {
							sodium: new Uint8Array(sodium.crypto_box_PUBLICKEYBYTES),
							ntru: new Uint8Array(ntru.publicKeyLength)
						};

						const nonce: Uint8Array			= new Uint8Array(
							cyphertext.buffer,
							0,
							sodium.crypto_secretbox_NONCEBYTES
						);

						const encryptedKeys: Uint8Array	= new Uint8Array(
							cyphertext.buffer,
							sodium.crypto_secretbox_NONCEBYTES
						);

						try {
							this.importFriendKeySet(
								sodium.crypto_secretbox_open_easy(
									encryptedKeys,
									nonce,
									this.sharedSecret
								)
							);
						}
						finally {
							sodium.memzero(this.sharedSecret);
							sodium.memzero(nonce);
							sodium.memzero(encryptedKeys);
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

						let paddingIndex: number	= 1;

						/* Flag for new key set */
						if (decrypted.data[0] === 1) {
							this.importFriendKeySet(decrypted.data, 1);
							paddingIndex += CastleCore.publicKeySetLength;
						}

						const messageIndex: number	= paddingIndex + 1 + decrypted.data[paddingIndex];

						try {
							if (decrypted.data.length > messageIndex) {
								this.handlers.receive(
									sodium.to_string(
										new Uint8Array(
											decrypted.data.buffer,
											messageIndex
										)
									)
								);
							}
						}
						finally {
							sodium.memzero(decrypted.data);
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
						sodium.memzero(cyphertext);
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
				let paddingIndex: number	= 1;

				if (this.shouldRatchetKeys) {
					this.shouldRatchetKeys	= false;
					publicKeySet			= this.generateKeySet();
					paddingIndex += CastleCore.publicKeySetLength;
				}

				const paddingLength: Uint8Array	= sodium.randombytes_buf(1);
				const padding: Uint8Array		= sodium.randombytes_buf(paddingLength[0]);

				const messageIndex: number		= paddingIndex + 1 + padding.length;

				const messageBytes: Uint8Array	=
					sodium.from_string(message)
				;

				const data: Uint8Array	= new Uint8Array(
					messageBytes.length +
					messageIndex
				);

				if (publicKeySet) {
					data[0]	= 1;
					data.set(publicKeySet, 1);
				}

				data.set(paddingLength, paddingIndex);
				data.set(padding, paddingIndex + 1);
				data.set(messageBytes, messageIndex);

				try {
					this.handlers.send(this.encrypt(data, keySet));
				}
				finally {
					sodium.memzero(messageBytes);
					sodium.memzero(data);

					if (publicKeySet) {
						sodium.memzero(publicKeySet);
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
				this.sharedSecret	= sodium.crypto_pwhash_scryptsalsa208sha256(
					sharedSecret,
					new Uint8Array(sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES),
					sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE,
					sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE,
					sodium.crypto_secretbox_KEYBYTES
				);

				const publicKeySet: Uint8Array	= this.generateKeySet();

				const nonce: Uint8Array			= sodium.randombytes_buf(
					sodium.crypto_secretbox_NONCEBYTES
				);

				const encryptedKeys: Uint8Array	= sodium.crypto_secretbox_easy(
					publicKeySet,
					nonce,
					this.sharedSecret
				);

				const cyphertext: Uint8Array	= new Uint8Array(
					sodium.crypto_secretbox_NONCEBYTES +
					encryptedKeys.length
				);

				cyphertext.set(nonce);
				cyphertext.set(encryptedKeys, sodium.crypto_secretbox_NONCEBYTES);

				try {
					this.handlers.send(sodium.to_base64(cyphertext));
				}
				finally {
					sodium.memzero(publicKeySet);
					sodium.memzero(nonce);
					sodium.memzero(encryptedKeys);
					sodium.memzero(cyphertext);

					setTimeout(() => {
						if (!this.isConnected) {
							this.abort();
						}
					}, CastleCore.handshakeTimeout);
				}
			}
		}
	}
}
