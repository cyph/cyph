/**
 * libsodium-inspired wrapper for the browser's native crypto API. Should only
 * ever be depended on by Potassium.
 */
export class NativeCrypto {
	private static Sodium		= self['sodium'];
	private static Subtle: any	= crypto['subtle'];

	private static importRawKey (
		key: Uint8Array,
		algorithm: any,
		purpose: string,
		callback: (cryptoKey: CryptoKey) => void
	) : void {
		NativeCrypto.Subtle.
			importKey('raw', key, algorithm, false, [purpose]).
			then(callback)
		;
	}

	private static exportRawKey (
		cryptoKey: CryptoKey,
		algorithmName: string,
		callback: (key: Uint8Array) => void
	) : void {
		NativeCrypto.Subtle.
			exportKey('raw', cryptoKey, algorithmName).
			then(callback)
		;
	}

	private static importJWK (
		key: Uint8Array,
		algorithm: any,
		purpose: string,
		callback: (cryptoKey: CryptoKey) => void
	) : void {
		NativeCrypto.Subtle.
			importKey(
				'jwk',
				JSON.parse(NativeCrypto.Sodium.to_string(key)),
				algorithm,
				false,
				[purpose]
			).
			then(callback)
		;
	}

	private static exportJWK (
		cryptoKey: CryptoKey,
		algorithmName: string,
		callback: (key: Uint8Array) => void
	) : void {
		NativeCrypto.Subtle.
			exportKey('jwk', cryptoKey, algorithmName).
			then(jwk => callback(NativeCrypto.Sodium.from_string(JSON.stringify(jwk))))
		;
	}

	public static box	= {
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
			callback: (keyPair: {
				keyType: string;
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}) => void
		) : void => {
			NativeCrypto.Subtle.generateKey(
				NativeCrypto.box.algorithm,
				true,
				['encrypt', 'decrypt']
			).then((cryptoKeyPair: CryptoKeyPair) : void => {
				const keyPair = {
					keyType: NativeCrypto.box.algorithm.name,
					publicKey: <Uint8Array> null,
					privateKey: <Uint8Array> null
				};

				NativeCrypto.exportJWK(
					cryptoKeyPair.publicKey,
					NativeCrypto.box.algorithm.name,
					(publicKey: Uint8Array) : void => {
						keyPair.publicKey	= publicKey;

						NativeCrypto.exportJWK(
							cryptoKeyPair.privateKey,
							NativeCrypto.box.algorithm.name,
							(privateKey: Uint8Array) : void => {
								keyPair.privateKey	= privateKey;

								callback(keyPair);
							}
						);
					}
				);
			});
		},

		seal: (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (cyphertext: Uint8Array) => void
		) : void => {
			const symmetricKey: Uint8Array			= NativeCrypto.Sodium.randombytes_buf(
				NativeCrypto.secretBox.keyBytes
			);

			const macKey: Uint8Array				= NativeCrypto.Sodium.randombytes_buf(
				NativeCrypto.oneTimeAuth.keyBytes
			);

			const asymmetricPlaintext: Uint8Array	= new Uint8Array(
				NativeCrypto.secretBox.keyBytes + NativeCrypto.oneTimeAuth.keyBytes
			);

			asymmetricPlaintext.set(symmetricKey);
			asymmetricPlaintext.set(macKey, NativeCrypto.secretBox.keyBytes);

			NativeCrypto.importJWK(
				publicKey,
				NativeCrypto.box.algorithm,
				'encrypt',
				(cryptoKey: CryptoKey) => NativeCrypto.Subtle.encrypt(
					NativeCrypto.box.algorithm.name,
					cryptoKey,
					asymmetricPlaintext
				).then((asymmetricCyphertextBuffer: ArrayBuffer) : void => {
					const asymmetricCyphertext: Uint8Array	= new Uint8Array(
						asymmetricCyphertextBuffer
					);

					NativeCrypto.oneTimeAuth.sign(
						asymmetricCyphertext,
						macKey,
						(mac: Uint8Array) => NativeCrypto.secretBox.seal(
							plaintext,
							nonce,
							symmetricKey,
							(symmetricCyphertext: Uint8Array) : void => {
								const cyphertext: Uint8Array	= new Uint8Array(
									NativeCrypto.box.algorithm.modulusLengthBytes +
									NativeCrypto.oneTimeAuth.bytes +
									symmetricCyphertext.length
								);

								cyphertext.set(asymmetricCyphertext);
								cyphertext.set(
									mac,
									NativeCrypto.box.algorithm.modulusLengthBytes
								);
								cyphertext.set(
									symmetricCyphertext,
									NativeCrypto.box.algorithm.modulusLengthBytes +
										NativeCrypto.oneTimeAuth.bytes
								);

								callback(cyphertext);
							}
						)
					);
				})
			);
		},

		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (plaintext: Uint8Array) => void
		) : void => {
			const asymmetricCyphertext: Uint8Array	= new Uint8Array(
				cyphertext.buffer,
				0,
				NativeCrypto.box.algorithm.modulusLengthBytes
			);

			const mac: Uint8Array					= new Uint8Array(
				cyphertext.buffer,
				NativeCrypto.box.algorithm.modulusLengthBytes,
				NativeCrypto.oneTimeAuth.bytes
			);

			const symmetricCyphertext: Uint8Array	= new Uint8Array(
				cyphertext.buffer,
				NativeCrypto.box.algorithm.modulusLengthBytes +
					NativeCrypto.oneTimeAuth.bytes
			);

			NativeCrypto.importJWK(
				privateKey,
				NativeCrypto.box.algorithm,
				'decrypt',
				(cryptoKey: CryptoKey) => NativeCrypto.Subtle.decrypt(
					NativeCrypto.box.algorithm.name,
					cryptoKey,
					asymmetricCyphertext
				).then((asymmetricPlaintext: ArrayBuffer) : void => {
					const symmetricKey: Uint8Array	= new Uint8Array(
						asymmetricPlaintext,
						0,
						NativeCrypto.secretBox.keyBytes
					);

					const macKey: Uint8Array		= new Uint8Array(
						asymmetricPlaintext,
						NativeCrypto.secretBox.keyBytes
					);

					NativeCrypto.oneTimeAuth.verify(
						mac,
						asymmetricCyphertext,
						macKey,
						(isValid: boolean) : void => {
							if (isValid) {
								NativeCrypto.secretBox.open(
									symmetricCyphertext,
									nonce,
									symmetricKey,
									callback
								);
							} else {
								throw new Error('Invalid RSA cyphertext.');
							}
						}
					);
				})
			);
		}
	};

	public static oneTimeAuth	= {
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
			callback: (mac: Uint8Array) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.oneTimeAuth.algorithm,
				'sign',
				(cryptoKey: CryptoKey) => NativeCrypto.Subtle.sign(
					NativeCrypto.oneTimeAuth.algorithm,
					cryptoKey,
					message
				).then((mac: ArrayBuffer) =>
					callback(new Uint8Array(mac))
				)
			);
		},

		verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array,
			callback: (isValid: boolean) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.oneTimeAuth.algorithm,
				'verify',
				(cryptoKey: CryptoKey) => NativeCrypto.Subtle.verify(
					NativeCrypto.oneTimeAuth.algorithm,
					cryptoKey,
					mac,
					message
				).then(callback)
			);
		}
	};

	public static passwordHash	= {
		algorithm: {
			name: 'PBKDF2',
			hash: {
				name: 'SHA-512'
			}
		},
		memLimit: 0,
		opsLimit: 250000,
		saltBytes: 32,

		hash: (
			plaintext: Uint8Array,
			salt: Uint8Array = NativeCrypto.Sodium.randombytes_buf(
				NativeCrypto.passwordHash.saltBytes
			),
			outputBytes: number = NativeCrypto.secretBox.keyBytes,
			opsLimit: number = NativeCrypto.passwordHash.opsLimit,
			memLimit: number = NativeCrypto.passwordHash.memLimit,
			callback: (hashData: {
				hash: Uint8Array;
				salt: Uint8Array;
				opsLimit: number;
				memLimit: number;
			}) => void
		) : void => {
			NativeCrypto.importRawKey(
				plaintext,
				NativeCrypto.passwordHash.algorithm,
				'deriveBits',
				(cryptoKey: CryptoKey) => NativeCrypto.Subtle.deriveBits(
					{
						name: NativeCrypto.passwordHash.algorithm.name,
						salt: salt,
						iterations: opsLimit,
						hash: NativeCrypto.passwordHash.algorithm.hash
					},
					cryptoKey,
					outputBytes * 8
				).then((hash: ArrayBuffer) =>
					callback({
						hash: new Uint8Array(hash),
						salt,
						opsLimit,
						memLimit
					})
				)
			);
		}
	};

	public static secretBox	= {
		algorithm: 'AES-GCM',
		keyBytes: 32,
		nonceBytes: 32,

		seal: (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			callback: (cyphertext: Uint8Array) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.secretBox.algorithm,
				'encrypt',
				(cryptoKey: CryptoKey) => NativeCrypto.Subtle.encrypt(
						{
						name: NativeCrypto.secretBox.algorithm,
						iv: nonce
					},
					cryptoKey,
					plaintext
				).then((cyphertext: ArrayBuffer) =>
					callback(new Uint8Array(cyphertext))
				)
			);
		},

		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			callback: (plaintext: Uint8Array) => void
		) : void => {
			NativeCrypto.importRawKey(
				key,
				NativeCrypto.secretBox.algorithm,
				'decrypt',
				(cryptoKey: CryptoKey) => NativeCrypto.Subtle.decrypt(
					{
						name: NativeCrypto.secretBox.algorithm,
						iv: nonce
					},
					cryptoKey,
					cyphertext
				).then((plaintext: ArrayBuffer) =>
					callback(new Uint8Array(plaintext))
				)
			);
		}
	};
}
