import {Potassium} from 'potassium';


/**
 * libsodium-inspired wrapper for the browser's native crypto API. Should only
 * ever be depended on by Potassium.
 */
export class NativeCrypto {
	private static Subtle: any	= crypto['subtle'];

	private static async importRawKey (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return NativeCrypto.Subtle.importKey(
			'raw',
			new Uint8Array(key).buffer,
			algorithm,
			false,
			[purpose]
		);
	}

	private static async exportRawKey (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return NativeCrypto.Subtle.exportKey(
			'raw',
			cryptoKey,
			algorithmName
		);
	}

	private static async importJWK (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return NativeCrypto.Subtle.importKey(
			'jwk',
			JSON.parse(
				Potassium.toString(
					new Uint8Array(new Uint8Array(key).buffer, 0, key.indexOf(0))
				)
			),
			algorithm,
			false,
			[purpose]
		);
	}

	private static async exportJWK (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return Potassium.fromString(
			JSON.stringify(
				await NativeCrypto.Subtle.exportKey(
					'jwk',
					cryptoKey,
					algorithmName
				)
			)
		);
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

		keyPair: async () : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => {
			const keyPair: CryptoKeyPair	= await NativeCrypto.Subtle.generateKey(
				NativeCrypto.Box.algorithm,
				true,
				['encrypt', 'decrypt']
			);

			return {
				keyType: NativeCrypto.Box.algorithm.name,
				publicKey: await NativeCrypto.exportJWK(
					keyPair.publicKey,
					NativeCrypto.Box.algorithm.name
				),
				privateKey: await NativeCrypto.exportJWK(
					keyPair.privateKey,
					NativeCrypto.Box.algorithm.name
				)
			};
		},

		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			const asymmetricPlaintext: Uint8Array	= Potassium.randomBytes(
				NativeCrypto.SecretBox.keyBytes + NativeCrypto.OneTimeAuth.keyBytes
			);

			const symmetricKey: Uint8Array			= new Uint8Array(
				asymmetricPlaintext.buffer,
				0,
				NativeCrypto.SecretBox.keyBytes
			);

			const symmetricCyphertext: Uint8Array	= await NativeCrypto.SecretBox.seal(
				plaintext,
				nonce,
				symmetricKey
			);

			const asymmetricCyphertext: Uint8Array	= new Uint8Array(
				await NativeCrypto.Subtle.encrypt(
					NativeCrypto.Box.algorithm.name,
					await NativeCrypto.importJWK(
						publicKey,
						NativeCrypto.Box.algorithm,
						'encrypt'
					),
					asymmetricPlaintext
				)
			);

			const macKey: Uint8Array				= new Uint8Array(
				asymmetricPlaintext.buffer,
				NativeCrypto.SecretBox.keyBytes
			);

			const mac: Uint8Array					= await NativeCrypto.OneTimeAuth.sign(
				asymmetricCyphertext,
				macKey
			);

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

			Potassium.clearMemory(asymmetricPlaintext);
			Potassium.clearMemory(symmetricCyphertext);
			Potassium.clearMemory(asymmetricCyphertext);
			Potassium.clearMemory(mac);

			return cyphertext;
		},

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			cyphertext	= new Uint8Array(cyphertext)

			try {
				const asymmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					0,
					NativeCrypto.Box.algorithm.modulusLengthBytes
				);

				const asymmetricPlaintext: Uint8Array	= new Uint8Array(
					await NativeCrypto.Subtle.decrypt(
						NativeCrypto.Box.algorithm.name,
						await NativeCrypto.importJWK(
							privateKey,
							NativeCrypto.Box.algorithm,
							'decrypt'
						),
						asymmetricCyphertext
					)
				);

				const symmetricKey: Uint8Array			= new Uint8Array(
					asymmetricPlaintext.buffer,
					0,
					NativeCrypto.SecretBox.keyBytes
				);

				const symmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					NativeCrypto.Box.algorithm.modulusLengthBytes +
						NativeCrypto.OneTimeAuth.bytes
				);

				const macKey: Uint8Array				= new Uint8Array(
					asymmetricPlaintext.buffer,
					NativeCrypto.SecretBox.keyBytes
				);

				const mac: Uint8Array					= new Uint8Array(
					cyphertext.buffer,
					NativeCrypto.Box.algorithm.modulusLengthBytes,
					NativeCrypto.OneTimeAuth.bytes
				);

				const plaintext: Uint8Array	= await NativeCrypto.SecretBox.open(
					symmetricCyphertext,
					nonce,
					symmetricKey
				);

				const isValid: boolean		= await NativeCrypto.OneTimeAuth.verify(
					mac,
					asymmetricCyphertext,
					macKey
				);

				Potassium.clearMemory(asymmetricPlaintext);

				if (isValid) {
					return plaintext;
				}
				else {
					Potassium.clearMemory(plaintext);
					throw new Error('Invalid RSA cyphertext.');
				}
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

		sign: async (
			message: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return new Uint8Array(
				await NativeCrypto.Subtle.sign(
					NativeCrypto.OneTimeAuth.algorithm,
					await NativeCrypto.importRawKey(
						key,
						NativeCrypto.OneTimeAuth.algorithm,
						'sign'
					),
					message
				)
			);
		},

		verify: async (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) : Promise<boolean> => {
			return NativeCrypto.Subtle.verify(
				NativeCrypto.OneTimeAuth.algorithm,
				await NativeCrypto.importRawKey(
					key,
					NativeCrypto.OneTimeAuth.algorithm,
					'verify'
				),
				mac,
				message
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

		hash: async (
			plaintext: Uint8Array,
			salt: Uint8Array = Potassium.randomBytes(
				NativeCrypto.PasswordHash.saltBytes
			),
			outputBytes: number = NativeCrypto.SecretBox.keyBytes,
			opsLimit: number = NativeCrypto.PasswordHash.opsLimitInteractive,
			memLimit: number = NativeCrypto.PasswordHash.memLimitInteractive
		) : Promise<Uint8Array> => {
			return new Uint8Array(
				await NativeCrypto.Subtle.deriveBits(
					{
						name: NativeCrypto.PasswordHash.algorithm.name,
						salt,
						iterations: opsLimit,
						hash: NativeCrypto.PasswordHash.algorithm.hash
					},
					await NativeCrypto.importRawKey(
						plaintext,
						NativeCrypto.PasswordHash.algorithm,
						'deriveBits'
					),
					outputBytes * 8
				)
			);
		}
	};

	public static SecretBox	= {
		algorithm: 'AES-GCM',
		keyBytes: 32,
		nonceBytes: 32,

		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return new Uint8Array(
				await NativeCrypto.Subtle.encrypt(
					{
						name: NativeCrypto.SecretBox.algorithm,
						iv: nonce
					},
					await NativeCrypto.importRawKey(
						key,
						NativeCrypto.SecretBox.algorithm,
						'encrypt'
					),
					plaintext
				)
			);
		},

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return new Uint8Array(
				await NativeCrypto.Subtle.decrypt(
					{
						name: NativeCrypto.SecretBox.algorithm,
						iv: nonce
					},
					await NativeCrypto.importRawKey(
						key,
						NativeCrypto.SecretBox.algorithm,
						'decrypt'
					),
					cyphertext
				)
			);
		}
	};
}
