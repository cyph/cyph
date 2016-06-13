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
		purpose: string
	) : Promise<CryptoKey> {
		return Promise.resolve().then(() => NativeCrypto.Subtle.importKey(
			'raw',
			new Uint8Array(key).buffer,
			algorithm,
			false,
			[purpose]
		));
	}

	private static exportRawKey (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return NativeCrypto.Subtle.exportKey(
			'raw',
			cryptoKey,
			algorithmName
		);
	}

	private static importJWK (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return Promise.resolve().then(() => NativeCrypto.Subtle.importKey(
			'jwk',
			JSON.parse(
				Potassium.toString(
					new Uint8Array(new Uint8Array(key).buffer, 0, key.indexOf(0))
				)
			),
			algorithm,
			false,
			[purpose]
		));
	}

	private static exportJWK (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return NativeCrypto.Subtle.exportKey(
			'jwk',
			cryptoKey,
			algorithmName
		).then(jwk =>
			Potassium.fromString(JSON.stringify(jwk))
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

		keyPair: () : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => {
			return NativeCrypto.Subtle.generateKey(
				NativeCrypto.Box.algorithm,
				true,
				['encrypt', 'decrypt']
			).then((keyPair: CryptoKeyPair) => Promise.all([
				NativeCrypto.exportJWK(keyPair.publicKey, NativeCrypto.Box.algorithm.name),
				NativeCrypto.exportJWK(keyPair.privateKey, NativeCrypto.Box.algorithm.name)
			])).then(results => ({
				keyType: NativeCrypto.Box.algorithm.name,
				publicKey: results[0],
				privateKey: results[1]
			}));
		},

		seal: (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			return NativeCrypto.importJWK(
				publicKey,
				NativeCrypto.Box.algorithm,
				'encrypt'
			).then((cryptoKey: CryptoKey) => {
				const asymmetricPlaintext: Uint8Array	= Potassium.randomBytes(
					NativeCrypto.SecretBox.keyBytes + NativeCrypto.OneTimeAuth.keyBytes
				);

				const symmetricKey: Uint8Array			= new Uint8Array(
					asymmetricPlaintext.buffer,
					0,
					NativeCrypto.SecretBox.keyBytes
				);

				return Promise.all([
					asymmetricPlaintext,
					NativeCrypto.SecretBox.seal(
						plaintext,
						nonce,
						symmetricKey
					),
					NativeCrypto.Subtle.encrypt(
						NativeCrypto.Box.algorithm.name,
						cryptoKey,
						asymmetricPlaintext
					)
				]);
			}).then(results => {
				const asymmetricPlaintext: Uint8Array	= results[0];
				const symmetricCyphertext: Uint8Array	= results[1];
				const asymmetricCyphertext: Uint8Array	= new Uint8Array(results[2]);

				const macKey: Uint8Array	= new Uint8Array(
					asymmetricPlaintext.buffer,
					NativeCrypto.SecretBox.keyBytes
				);

				return Promise.all([
					asymmetricPlaintext,
					symmetricCyphertext,
					asymmetricCyphertext,
					NativeCrypto.OneTimeAuth.sign(
						asymmetricCyphertext,
						macKey
					)
				]);
			}).then(results => {
				const asymmetricPlaintext: Uint8Array	= results[0];
				const symmetricCyphertext: Uint8Array	= results[1];
				const asymmetricCyphertext: Uint8Array	= results[2];
				const mac: Uint8Array					= results[3];

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
			});
		},

		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			return NativeCrypto.importJWK(
				privateKey,
				NativeCrypto.Box.algorithm,
				'decrypt'
			).then((cryptoKey: CryptoKey) => {
				cyphertext	= new Uint8Array(cyphertext);

				const asymmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					0,
					NativeCrypto.Box.algorithm.modulusLengthBytes
				);

				return Promise.all([
					asymmetricCyphertext,
					NativeCrypto.Subtle.decrypt(
						NativeCrypto.Box.algorithm.name,
						cryptoKey,
						asymmetricCyphertext
					)
				]);
			}).then(results => {
				const asymmetricCyphertext: Uint8Array	= results[0];
				const asymmetricPlaintext: Uint8Array	= new Uint8Array(results[1]);

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

				return Promise.all([
					asymmetricPlaintext,
					NativeCrypto.SecretBox.open(
						symmetricCyphertext,
						nonce,
						symmetricKey
					),
					NativeCrypto.OneTimeAuth.verify(
						mac,
						asymmetricCyphertext,
						macKey
					)
				]);
			}).then(results => {
				const asymmetricPlaintext: Uint8Array	= results[0];
				const plaintext: Uint8Array				= results[1];
				const isValid: boolean					= results[2];

				Potassium.clearMemory(asymmetricPlaintext);
				Potassium.clearMemory(cyphertext);

				if (isValid) {
					return plaintext;
				} else {
					Potassium.clearMemory(plaintext);
					throw new Error('Invalid RSA cyphertext.');
				}
			}).catch(err => {
				Potassium.clearMemory(cyphertext);

				throw err;
			});
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
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return NativeCrypto.importRawKey(
				key,
				NativeCrypto.OneTimeAuth.algorithm,
				'sign'
			).then((cryptoKey: CryptoKey) => NativeCrypto.Subtle.sign(
				NativeCrypto.OneTimeAuth.algorithm,
				cryptoKey,
				message
			)).then((mac: ArrayBuffer) =>
				new Uint8Array(mac)
			);
		},

		verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) : Promise<boolean> => {
			return NativeCrypto.importRawKey(
				key,
				NativeCrypto.OneTimeAuth.algorithm,
				'verify'
			).then((cryptoKey: CryptoKey) => NativeCrypto.Subtle.verify(
				NativeCrypto.OneTimeAuth.algorithm,
				cryptoKey,
				mac,
				message
			));
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
			memLimit: number = NativeCrypto.PasswordHash.memLimitInteractive
		) : Promise<Uint8Array> => {
			return NativeCrypto.importRawKey(
				plaintext,
				NativeCrypto.PasswordHash.algorithm,
				'deriveBits'
			).then((cryptoKey: CryptoKey) => NativeCrypto.Subtle.deriveBits(
				{
					name: NativeCrypto.PasswordHash.algorithm.name,
					salt,
					iterations: opsLimit,
					hash: NativeCrypto.PasswordHash.algorithm.hash
				},
				cryptoKey,
				outputBytes * 8
			)).then((hash: ArrayBuffer) =>
				new Uint8Array(hash)
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
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return NativeCrypto.importRawKey(
				key,
				NativeCrypto.SecretBox.algorithm,
				'encrypt'
			).then((cryptoKey: CryptoKey) => NativeCrypto.Subtle.encrypt(
				{
					name: NativeCrypto.SecretBox.algorithm,
					iv: nonce
				},
				cryptoKey,
				plaintext
			)).then((cyphertext: ArrayBuffer) =>
				new Uint8Array(cyphertext)
			);
		},

		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return NativeCrypto.importRawKey(
				key,
				NativeCrypto.SecretBox.algorithm,
				'decrypt'
			).then((cryptoKey: CryptoKey) => NativeCrypto.Subtle.decrypt(
				{
					name: NativeCrypto.SecretBox.algorithm,
					iv: nonce
				},
				cryptoKey,
				cyphertext
			)).then((plaintext: ArrayBuffer) =>
				new Uint8Array(plaintext)
			);
		}
	};
}
