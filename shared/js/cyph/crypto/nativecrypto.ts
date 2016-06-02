import {Potassium} from 'potassium';


/**
 * libsodium-inspired wrapper for the browser's native crypto API. Should only
 * ever be depended on by Potassium.
 */
export class NativeCrypto {
	private static Subtle: any	= crypto['subtle'];

	private static importRawKey (
		key: Uint8Array,
		algorithm: any,
		purpose: string,
		callback: (cryptoKey: CryptoKey, err: any) => void
	) : void {
		NativeCrypto.Subtle.
			importKey('raw', key.buffer, algorithm, false, [purpose]).
			then(callback).
			catch(err => callback(undefined, err))
		;
	}

	private static exportRawKey (
		cryptoKey: CryptoKey,
		algorithmName: string,
		callback: (key: Uint8Array, any) => void
	) : void {
		NativeCrypto.Subtle.
			exportKey('raw', cryptoKey, algorithmName).
			then(callback).
			catch(err => callback(undefined, err))
		;
	}

	private static importJWK (
		key: Uint8Array,
		algorithm: any,
		purpose: string,
		callback: (cryptoKey: CryptoKey, err: any) => void
	) : void {
		NativeCrypto.Subtle.
			importKey(
				'jwk',
				JSON.parse(Potassium.toString(key)),
				algorithm,
				false,
				[purpose]
			).
			then(callback).
			catch(err => callback(undefined, err))
		;
	}

	private static exportJWK (
		cryptoKey: CryptoKey,
		algorithmName: string,
		callback: (key: Uint8Array, err: any) => void
	) : void {
		NativeCrypto.Subtle.
			exportKey('jwk', cryptoKey, algorithmName).
			then(jwk => callback(Potassium.fromString(JSON.stringify(jwk)), undefined)).
			catch(err => callback(undefined, err))
		;
	}

	public static Box	= {
		algorithm: {
			name: 'RSA-OAEP',
			hash: {
				name: 'SHA-256'
			},
			modulusLength: 2048,
			modulusLengthBytes: 256,
			publicExponent: new Uint8Array([0x01, 0x00, 0x01])
		},
		publicKeyBytes: 450,
		privateKeyBytes: 1700,

		keyPair: (
			callback: (
				keyPair: {
					keyType: string;
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				},
				err: any
			) => void
		) : void => {
			NativeCrypto.Subtle.generateKey(
				NativeCrypto.Box.algorithm,
				true,
				['encrypt', 'decrypt']
			).then((cryptoKeyPair: CryptoKeyPair) : void => {
				const keyPair = {
					keyType: NativeCrypto.Box.algorithm.name,
					publicKey: <Uint8Array> null,
					privateKey: <Uint8Array> null
				};

				NativeCrypto.exportJWK(
					cryptoKeyPair.publicKey,
					NativeCrypto.Box.algorithm.name,
					(publicKey: Uint8Array, err: any) : void => {
						if (err) {
							callback(undefined, err);
							return;
						}

						keyPair.publicKey	= publicKey;

						NativeCrypto.exportJWK(
							cryptoKeyPair.privateKey,
							NativeCrypto.Box.algorithm.name,
							(privateKey: Uint8Array, err: any) : void => {
								if (err) {
									callback(undefined, err);
									return;
								}

								keyPair.privateKey	= privateKey;

								callback(keyPair, undefined);
							}
						);
					}
				);
			}).catch(err =>
				callback(undefined, err)
			);
		},

		seal: (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (cyphertext: Uint8Array, err: any) => void
		) : void => {
			const symmetricKey: Uint8Array			= Potassium.randomBytes(
				NativeCrypto.SecretBox.keyBytes
			);

			const macKey: Uint8Array				= Potassium.randomBytes(
				NativeCrypto.OneTimeAuth.keyBytes
			);

			const asymmetricPlaintext: Uint8Array	= new Uint8Array(
				NativeCrypto.SecretBox.keyBytes + NativeCrypto.OneTimeAuth.keyBytes
			);

			asymmetricPlaintext.set(symmetricKey);
			asymmetricPlaintext.set(macKey, NativeCrypto.SecretBox.keyBytes);

			NativeCrypto.importJWK(
				publicKey,
				NativeCrypto.Box.algorithm,
				'encrypt',
				(cryptoKey: CryptoKey, err: any) => {
					if (err) {
						callback(undefined, err);
						return;
					}

					NativeCrypto.Subtle.encrypt(
						NativeCrypto.Box.algorithm.name,
						cryptoKey,
						asymmetricPlaintext
					).then((asymmetricCyphertextBuffer: ArrayBuffer) : void => {
						const asymmetricCyphertext: Uint8Array	= new Uint8Array(
							asymmetricCyphertextBuffer
						);

						NativeCrypto.OneTimeAuth.sign(
							asymmetricCyphertext,
							macKey,
							(mac: Uint8Array, err: any) => {
								if (err) {
									callback(undefined, err);
									return;
								}

								NativeCrypto.SecretBox.seal(
									plaintext,
									nonce,
									symmetricKey,
									(symmetricCyphertext: Uint8Array, err: any) : void => {
										if (err) {
											callback(undefined, err);
											return;
										}

										const cyphertext: Uint8Array	= new Uint8Array(
											NativeCrypto.Box.algorithm.modulusLengthBytes +
											NativeCrypto.OneTimeAuth.bytes +
											symmetricCyphertext.length
										);

										cyphertext.set(asymmetricCyphertext);
										cyphertext.set(
											mac,
											NativeCrypto.Box.algorithm.modulusLengthBytes
										);
										cyphertext.set(
											symmetricCyphertext,
											NativeCrypto.Box.algorithm.modulusLengthBytes +
												NativeCrypto.OneTimeAuth.bytes
										);

										callback(cyphertext, undefined);
									}
								);
							}
						);
					}).catch(err =>
						callback(undefined, err)
					);
				}
			);
		},

		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (plaintext: Uint8Array, err: any) => void
		) : void => {
			try {
				cyphertext	= new Uint8Array(cyphertext);

				const asymmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					0,
					NativeCrypto.Box.algorithm.modulusLengthBytes
				);

				const mac: Uint8Array					= new Uint8Array(
					cyphertext.buffer,
					NativeCrypto.Box.algorithm.modulusLengthBytes,
					NativeCrypto.OneTimeAuth.bytes
				);

				const symmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					NativeCrypto.Box.algorithm.modulusLengthBytes +
						NativeCrypto.OneTimeAuth.bytes
				);

				NativeCrypto.importJWK(
					privateKey,
					NativeCrypto.Box.algorithm,
					'decrypt',
					(cryptoKey: CryptoKey, err: any) => {
						if (err) {
							callback(undefined, err);
						}

						NativeCrypto.Subtle.decrypt(
							NativeCrypto.Box.algorithm.name,
							cryptoKey,
							asymmetricCyphertext
						).then((asymmetricPlaintext: ArrayBuffer) : void => {
							const symmetricKey: Uint8Array	= new Uint8Array(
								asymmetricPlaintext,
								0,
								NativeCrypto.SecretBox.keyBytes
							);

							const macKey: Uint8Array		= new Uint8Array(
								asymmetricPlaintext,
								NativeCrypto.SecretBox.keyBytes
							);

							NativeCrypto.OneTimeAuth.verify(
								mac,
								asymmetricCyphertext,
								macKey,
								(isValid: boolean, err: any) : void => {
									if (err) {
										callback(undefined, err);
										return;
									}

									if (isValid) {
										NativeCrypto.SecretBox.open(
											symmetricCyphertext,
											nonce,
											symmetricKey,
											callback
										);
									} else {
										callback(undefined, new Error('Invalid RSA cyphertext.'));
									}
								}
							);
						}).catch(err =>
							callback(undefined, err)
						);
					}
				);
			}
			catch (err) {
				callback(undefined, err);
			}
			finally {
				Potassium.clearMemory(cyphertext);
			}
		}
	};

	public static OneTimeAuth	= {
		algorithm: {
			name: 'HMAC',
			hash: {
				name: 'SHA-256'
			}
		},
		bytes: 32,
		keyBytes: 32,

		sign: (
			message: Uint8Array,
			key: Uint8Array,
			callback: (mac: Uint8Array, err: any) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.OneTimeAuth.algorithm,
				'sign',
				(cryptoKey: CryptoKey, err: any) => {
					if (err) {
						callback(undefined, err);
						return;
					}

					NativeCrypto.Subtle.sign(
						NativeCrypto.OneTimeAuth.algorithm,
						cryptoKey,
						message
					).then((mac: ArrayBuffer) =>
						callback(new Uint8Array(mac), undefined)
					).catch(err =>
						callback(undefined, err)
					);
				}
			);
		},

		verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array,
			callback: (isValid: boolean, err: any) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.OneTimeAuth.algorithm,
				'verify',
				(cryptoKey: CryptoKey, err: any) => {
					if (err) {
						callback(undefined, err);
						return;
					}

					NativeCrypto.Subtle.verify(
						NativeCrypto.OneTimeAuth.algorithm,
						cryptoKey,
						mac,
						message
					).then(callback).catch(err =>
						callback(undefined, err)
					);
				}
			);
		}
	};

	public static PasswordHash	= {
		algorithm: {
			name: 'PBKDF2',
			hash: {
				name: 'SHA-512'
			}
		},
		memLimitInteractive: 0,
		memLimitSensitive: 0,
		opsLimitInteractive: 250000,
		opsLimitSensitive: 2500000,
		saltBytes: 32,

		hash: (
			plaintext: Uint8Array,
			salt: Uint8Array = Potassium.randomBytes(
				NativeCrypto.PasswordHash.saltBytes
			),
			outputBytes: number = NativeCrypto.SecretBox.keyBytes,
			opsLimit: number = NativeCrypto.PasswordHash.opsLimitInteractive,
			memLimit: number = NativeCrypto.PasswordHash.memLimitInteractive,
			callback: (
				hash: Uint8Array,
				salt: Uint8Array,
				outputBytes: number,
				opsLimit: number,
				memLimit: number,
				err: any
			) => void
		) : void => {
			NativeCrypto.importRawKey(
				plaintext,
				NativeCrypto.PasswordHash.algorithm,
				'deriveBits',
				(cryptoKey: CryptoKey, err: any) => {
					if (err) {
						callback(
							undefined,
							undefined,
							undefined,
							undefined,
							undefined,
							err
						);
						return;
					}

					NativeCrypto.Subtle.deriveBits(
						{
							name: NativeCrypto.PasswordHash.algorithm.name,
							salt: salt,
							iterations: opsLimit,
							hash: NativeCrypto.PasswordHash.algorithm.hash
						},
						cryptoKey,
						outputBytes * 8
					).then((hash: ArrayBuffer) =>
						callback(
							new Uint8Array(hash),
							salt,
							outputBytes,
							opsLimit,
							memLimit,
							undefined
						)
					).catch(err =>
						callback(
							undefined,
							undefined,
							undefined,
							undefined,
							undefined,
							err
						)
					);
				}
			);
		}
	};

	public static SecretBox	= {
		algorithm: 'AES-GCM',
		keyBytes: 32,
		nonceBytes: 32,

		seal: (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			callback: (cyphertext: Uint8Array, err: any) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.SecretBox.algorithm,
				'encrypt',
				(cryptoKey: CryptoKey, err: any) => {
					if (err) {
						callback(undefined, err);
						return;
					}

					NativeCrypto.Subtle.encrypt(
						{
							name: NativeCrypto.SecretBox.algorithm,
							iv: nonce
						},
						cryptoKey,
						plaintext
					).then((cyphertext: ArrayBuffer) =>
						callback(new Uint8Array(cyphertext), undefined)
					).catch(err =>
						callback(undefined, err)
					);
				}
			);
		},

		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			callback: (plaintext: Uint8Array, err: any) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.SecretBox.algorithm,
				'decrypt',
				(cryptoKey: CryptoKey, err: any) => {
					if (err) {
						callback(undefined, err);
						return;
					}

					NativeCrypto.Subtle.decrypt(
						{
							name: NativeCrypto.SecretBox.algorithm,
							iv: nonce
						},
						cryptoKey,
						cyphertext
					).then((plaintext: ArrayBuffer) =>
						callback(new Uint8Array(plaintext), undefined)
					).catch(err =>
						callback(undefined, err)
					);
				}
			);
		}
	};
}
