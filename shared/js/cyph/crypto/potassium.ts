import {NativeCrypto} from 'nativecrypto';


/**
 * libsodium-inspired wrapper for the post-quantum primitives used by Cyph.
 * Outside of this class, libsodium and other cryptographic implementations
 * should generally not be called directly.
 */
export class Potassium {
	private static NTRU			= self['ntru'] || {};
	private static SIDH			= self['sidh'] || {};
	private static Sodium		= self['sodium'] || {};
	private static SuperSphincs	= self['superSphincs'] || {};

	public static clearMemory (a: Uint8Array) : void {
		if (a instanceof Uint8Array) {
			Potassium.Sodium.memzero(a);
		}
	}

	public static compareMemory (a: Uint8Array, b: Uint8Array) : boolean {
		return a.length === b.length && Potassium.Sodium.memcmp(a, b);
	}

	public static fromBase64 (s: string|Uint8Array) : Uint8Array {
		return typeof s === 'string' ?
			Potassium.Sodium.from_base64(s) :
			s
		;
	}

	public static fromHex (s: string|Uint8Array) : Uint8Array {
		return typeof s === 'string' ?
			Potassium.Sodium.from_hex(s) :
			s
		;
	}

	public static fromString (s: string|Uint8Array) : Uint8Array {
		return typeof s === 'string' ?
			Potassium.Sodium.from_string(s) :
			s
		;
	}

	public static randomBytes (n: number) : Uint8Array {
		const bytes	= new Uint8Array(n);
		crypto.getRandomValues(bytes);
		return bytes;
	}

	public static toBase64 (a: Uint8Array|string) : string {
		return typeof a === 'string' ?
			a :
			Potassium.Sodium.to_base64(a).replace(/\s+/g, '')
		;
	}

	public static toHex (a: Uint8Array|string) : string {
		return typeof a === 'string' ?
			a :
			Potassium.Sodium.to_hex(a)
		;
	}

	public static toString (a: Uint8Array|string) : string {
		return typeof a === 'string' ?
			a :
			Potassium.Sodium.to_string(a)
		;
	}


	private newNonce (size: number) {
		if (size < 4) {
			throw 'Nonce size too small.';
		}

		if (this.isCreator) {
			++this.counter;
		}
		else {
			--this.counter;
		}

		const nonce	= Potassium.randomBytes(size);
		nonce.set(new Uint8Array(new Int32Array([this.counter]).buffer));
		return nonce;
	}

	private BoxHelpers	= {
		keyPair: async () : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => Potassium.Sodium.crypto_box_keypair(),

		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_box_easy(
			plaintext,
			nonce,
			publicKey,
			privateKey
		),

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_box_open_easy(
			cyphertext,
			nonce,
			publicKey,
			privateKey
		)
	};

	private PasswordHashHelpers	= {
		hash: async (
			plaintext: Uint8Array,
			salt: Uint8Array,
			outputBytes: number,
			opsLimit: number,
			memLimit: number
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256(
			outputBytes,
			plaintext,
			salt,
			opsLimit,
			memLimit
		)
	};

	private SecretBoxHelpers	= {
		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_aead_chacha20poly1305_encrypt(
			plaintext,
			null,
			null,
			nonce,
			key
		),

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_aead_chacha20poly1305_decrypt(
			null,
			cyphertext,
			null,
			nonce,
			key
		)
	};

	public native () : boolean {
		return this.isNative;
	}

	public Box	= {
		nonceBytes: <number> Potassium.Sodium.crypto_box_NONCEBYTES,
		publicKeyBytes: <number>
			Potassium.NTRU.publicKeyLength +
			Potassium.SIDH.publicKeyLength +
			Potassium.Sodium.crypto_box_PUBLICKEYBYTES
		,
		privateKeyBytes: <number>
			Potassium.NTRU.privateKeyLength +
			Potassium.SIDH.privateKeyLength +
			Potassium.Sodium.crypto_box_SECRETKEYBYTES
		,

		keyPair: async (isCreator: boolean = this.isCreator) : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => {
			const sidhKeyPair: {
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}	= Potassium.SIDH.keyPair(isCreator);

			const ntruKeyPair: {
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}	= Potassium.NTRU.keyPair();

			const altKeyPair: {
				keyType: string;
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}	= await this.BoxHelpers.keyPair();

			const keyPair: {
				keyType: string;
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}	= {
				keyType: 'potassium',
				publicKey: new Uint8Array(this.Box.publicKeyBytes),
				privateKey: new Uint8Array(this.Box.privateKeyBytes)
			};

			keyPair.publicKey.set(sidhKeyPair.publicKey);
			keyPair.publicKey.set(ntruKeyPair.publicKey, Potassium.SIDH.publicKeyLength);
			keyPair.publicKey.set(
				altKeyPair.publicKey,
				Potassium.SIDH.publicKeyLength + Potassium.NTRU.publicKeyLength
			);

			keyPair.privateKey.set(sidhKeyPair.privateKey);
			keyPair.privateKey.set(ntruKeyPair.privateKey, Potassium.SIDH.privateKeyLength);
			keyPair.privateKey.set(
				altKeyPair.privateKey,
				Potassium.SIDH.privateKeyLength + Potassium.NTRU.privateKeyLength
			);

			Potassium.clearMemory(sidhKeyPair.privateKey);
			Potassium.clearMemory(ntruKeyPair.privateKey);
			Potassium.clearMemory(altKeyPair.privateKey);
			Potassium.clearMemory(sidhKeyPair.publicKey);
			Potassium.clearMemory(ntruKeyPair.publicKey);
			Potassium.clearMemory(altKeyPair.publicKey);

			return keyPair;
		},

		seal: async (
			plaintext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			publicKey	= new Uint8Array(publicKey);
			privateKey	= new Uint8Array(privateKey);

			try {
				const publicKeys	= {
					sidh: new Uint8Array(
						publicKey.buffer,
						0,
						Potassium.SIDH.publicKeyLength
					),
					ntru: new Uint8Array(
						publicKey.buffer,
						Potassium.SIDH.publicKeyLength,
						Potassium.NTRU.publicKeyLength
					),
					alt: new Uint8Array(
						publicKey.buffer,
						Potassium.SIDH.publicKeyLength + Potassium.NTRU.publicKeyLength
					)
				};

				const privateKeys	= {
					sidh: new Uint8Array(
						privateKey.buffer,
						0,
						Potassium.SIDH.privateKeyLength
					),
					ntru: new Uint8Array(
						privateKey.buffer,
						Potassium.SIDH.privateKeyLength,
						Potassium.NTRU.privateKeyLength
					),
					alt: new Uint8Array(
						privateKey.buffer,
						Potassium.SIDH.privateKeyLength + Potassium.NTRU.privateKeyLength
					)
				};

				const nonce: Uint8Array					= this.newNonce(this.Box.nonceBytes);

				const ntruPlaintext: Uint8Array			= Potassium.randomBytes(
					this.SecretBox.keyBytes + this.OneTimeAuth.keyBytes
				);
				const ntruSymmetricKey: Uint8Array		= new Uint8Array(
					ntruPlaintext.buffer,
					0,
					this.SecretBox.keyBytes
				);
				const ntruAuthKey: Uint8Array			= new Uint8Array(
					ntruPlaintext.buffer,
					this.SecretBox.keyBytes
				);
				const ntruKeyCyphertext: Uint8Array		= Potassium.NTRU.encrypt(
					ntruPlaintext,
					publicKeys.ntru
				);
				const ntruMac: Uint8Array				= await this.OneTimeAuth.sign(
					ntruKeyCyphertext,
					ntruAuthKey
				);

				const sidhSecret: Uint8Array			= Potassium.SIDH.secret(
					publicKeys.sidh,
					privateKeys.sidh
				);
				const sidhSymmetricKey: Uint8Array		= await this.PasswordHash.weakHash(
					sidhSecret,
					this.SecretBox.keyBytes
				);

				const altCyphertext: Uint8Array			= await this.BoxHelpers.seal(
					plaintext,
					nonce,
					publicKeys.alt,
					privateKeys.alt
				);
				const sidhCyphertext: Uint8Array		= await this.SecretBox.seal(
					altCyphertext,
					sidhSymmetricKey
				);
				const ntruCyphertext: Uint8Array		= await this.SecretBox.seal(
					sidhCyphertext,
					ntruSymmetricKey
				);

				const cyphertext: Uint8Array	= new Uint8Array(
					Potassium.NTRU.encryptedDataLength +
					this.OneTimeAuth.bytes +
					this.Box.nonceBytes +
					ntruCyphertext.length
				);

				cyphertext.set(ntruKeyCyphertext);
				cyphertext.set(
					ntruMac,
					Potassium.NTRU.encryptedDataLength
				);
				cyphertext.set(
					nonce,
					Potassium.NTRU.encryptedDataLength +
						this.OneTimeAuth.bytes
				);
				cyphertext.set(
					ntruCyphertext,
					Potassium.NTRU.encryptedDataLength +
						this.OneTimeAuth.bytes +
						this.Box.nonceBytes
				);

				Potassium.clearMemory(nonce);
				Potassium.clearMemory(ntruPlaintext);
				Potassium.clearMemory(ntruKeyCyphertext);
				Potassium.clearMemory(ntruMac);
				Potassium.clearMemory(sidhSecret);
				Potassium.clearMemory(sidhSymmetricKey);
				Potassium.clearMemory(altCyphertext);
				Potassium.clearMemory(sidhCyphertext);
				Potassium.clearMemory(ntruCyphertext);

				return cyphertext;
			}
			finally {
				Potassium.clearMemory(privateKey);
				Potassium.clearMemory(publicKey);
			}
		},

		open: async (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			cyphertext	= new Uint8Array(cyphertext);
			publicKey	= new Uint8Array(publicKey);
			privateKey	= new Uint8Array(privateKey);

			try {
				const publicKeys	= {
					sidh: new Uint8Array(
						publicKey.buffer,
						0,
						Potassium.SIDH.publicKeyLength
					),
					ntru: new Uint8Array(
						publicKey.buffer,
						Potassium.SIDH.publicKeyLength,
						Potassium.NTRU.publicKeyLength
					),
					alt: new Uint8Array(
						publicKey.buffer,
						Potassium.SIDH.publicKeyLength + Potassium.NTRU.publicKeyLength
					)
				};

				const privateKeys	= {
					sidh: new Uint8Array(
						privateKey.buffer,
						0,
						Potassium.SIDH.privateKeyLength
					),
					ntru: new Uint8Array(
						privateKey.buffer,
						Potassium.SIDH.privateKeyLength,
						Potassium.NTRU.privateKeyLength
					),
					alt: new Uint8Array(
						privateKey.buffer,
						Potassium.SIDH.privateKeyLength + Potassium.NTRU.privateKeyLength
					)
				};

				const nonce: Uint8Array					= new Uint8Array(
					cyphertext.buffer,
					Potassium.NTRU.encryptedDataLength + this.OneTimeAuth.bytes,
					this.Box.nonceBytes
				);

				const ntruKeyCyphertext: Uint8Array		= new Uint8Array(
					cyphertext.buffer,
					0,
					Potassium.NTRU.encryptedDataLength
				);
				const ntruMac: Uint8Array				= new Uint8Array(
					cyphertext.buffer,
					Potassium.NTRU.encryptedDataLength,
					this.OneTimeAuth.bytes
				);
				const ntruCyphertext: Uint8Array		= new Uint8Array(
					cyphertext.buffer,
					Potassium.NTRU.encryptedDataLength +
						this.OneTimeAuth.bytes +
						this.Box.nonceBytes
				);
				const ntruPlaintext: Uint8Array			= Potassium.NTRU.decrypt(
					ntruKeyCyphertext,
					privateKeys.ntru
				);
				const ntruSymmetricKey: Uint8Array		= new Uint8Array(
					ntruPlaintext.buffer,
					0,
					this.SecretBox.keyBytes
				);
				const ntruAuthKey: Uint8Array			= new Uint8Array(
					ntruPlaintext.buffer,
					this.SecretBox.keyBytes
				);
				const isNtruCyphertextValid: boolean	= await this.OneTimeAuth.verify(
					ntruMac,
					ntruKeyCyphertext,
					ntruAuthKey
				);

				if (!isNtruCyphertextValid) {
					Potassium.clearMemory(ntruPlaintext);
					throw 'Invalid NTRU cyphertext.';
				}

				const sidhSecret: Uint8Array			= Potassium.SIDH.secret(
					publicKeys.sidh,
					privateKeys.sidh
				);
				const sidhSymmetricKey: Uint8Array		= await this.PasswordHash.weakHash(
					sidhSecret,
					this.SecretBox.keyBytes
				);

				const sidhCyphertext: Uint8Array		= await this.SecretBox.open(
					ntruCyphertext,
					ntruSymmetricKey
				);
				const altCyphertext: Uint8Array			= await this.SecretBox.open(
					sidhCyphertext,
					sidhSymmetricKey
				);

				const plaintext: Uint8Array		= await this.BoxHelpers.open(
					altCyphertext,
					nonce,
					publicKeys.alt,
					privateKeys.alt
				);

				Potassium.clearMemory(ntruPlaintext);
				Potassium.clearMemory(sidhSecret);
				Potassium.clearMemory(sidhSymmetricKey);
				Potassium.clearMemory(altCyphertext);

				return plaintext;
			}
			finally {
				Potassium.clearMemory(cyphertext);
				Potassium.clearMemory(publicKey);
				Potassium.clearMemory(privateKey);
			}
		}
	};

	public Hash	= {
		bytes: <number> Potassium.SuperSphincs.hashLength,

		hash: async (plaintext: Uint8Array|string) : Promise<Uint8Array> => {
			return (await Potassium.SuperSphincs.hash(plaintext)).binary;
		}
	};

	public OneTimeAuth	= {
		bytes: <number> Potassium.Sodium.crypto_onetimeauth_BYTES,
		keyBytes: <number> Potassium.Sodium.crypto_onetimeauth_KEYBYTES,

		sign: async (
			message: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return Potassium.Sodium.crypto_onetimeauth(
				message,
				key
			);
		},

		verify: async (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) : Promise<boolean> => {
			return Potassium.Sodium.crypto_onetimeauth_verify(
				mac,
				message,
				key
			);
		}
	};

	public PasswordHash	= {
		algorithm: 'scrypt',
		memLimitInteractive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE,
		memLimitSensitive: <number> 134217728 /* 128 MB */,
		opsLimitInteractive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE,
		opsLimitSensitive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
		saltBytes: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES,

		hash: async (
			plaintext: Uint8Array|string,
			salt: Uint8Array = Potassium.randomBytes(
				this.PasswordHash.saltBytes
			),
			outputBytes: number = this.SecretBox.keyBytes,
			opsLimit: number = this.PasswordHash.opsLimitInteractive,
			memLimit: number = this.PasswordHash.memLimitInteractive
		) : Promise<{
			hash: Uint8Array;
			metadata: Uint8Array,
			metadataObject: {
				algorithm: string;
				memLimit: number;
				opsLimit: number;
				salt: Uint8Array;
			};
		}> => {
			const plaintextBinary: Uint8Array	= Potassium.fromString(plaintext);

			try {
				const algorithm: Uint8Array	= Potassium.fromString(
					this.PasswordHash.algorithm
				);

				const metadata: Uint8Array	= new Uint8Array(
					12 + salt.length + algorithm.length
				);

				metadata.set(new Uint8Array(new Uint32Array([memLimit]).buffer));
				metadata.set(new Uint8Array(new Uint32Array([opsLimit]).buffer), 4);
				metadata.set(new Uint8Array(new Uint32Array([salt.length]).buffer), 8);
				metadata.set(salt, 12);
				metadata.set(algorithm, 12 + salt.length);

				return {
					hash: await this.PasswordHashHelpers.hash(
						plaintextBinary,
						salt,
						outputBytes,
						opsLimit,
						memLimit
					),
					metadata,
					metadataObject: {
						algorithm: this.PasswordHash.algorithm,
						memLimit,
						opsLimit,
						salt
					}
				};
			}
			finally {
				Potassium.clearMemory(plaintextBinary);
			}
		},

		parseMetadata: async (metadata: Uint8Array) : Promise<{
			algorithm: string;
			memLimit: number;
			opsLimit: number;
			salt: Uint8Array;
		}> => {
			metadata	= new Uint8Array(metadata);

			try {
				const saltBytes: number	= new Uint32Array(metadata.buffer, 2, 1)[0];

				return {
					algorithm: Potassium.toString(new Uint8Array(metadata.buffer, 12 + saltBytes)),
					memLimit: new Uint32Array(metadata.buffer, 0, 1)[0],
					opsLimit: new Uint32Array(metadata.buffer, 1, 1)[0],
					salt: new Uint8Array(new Uint8Array(metadata.buffer, 12, saltBytes)),
				};
			}
			finally {
				Potassium.clearMemory(metadata);
			}
		},

		weakHash: async (
			input: Uint8Array,
			outputBytes?: number
		) : Promise<Uint8Array> => this.PasswordHashHelpers.hash(
			input,
			new Uint8Array(this.PasswordHash.saltBytes),
			outputBytes || input.length,
			0,
			0
		)
	};

	public SecretBox	= {
		keyBytes: <number> Potassium.Sodium.crypto_aead_chacha20poly1305_KEYBYTES,
		nonceBytes: <number> Potassium.Sodium.crypto_aead_chacha20poly1305_NPUBBYTES,

		seal: async (
			plaintext: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			if (key.length % this.SecretBox.keyBytes !== 0) {
				throw 'Invalid key.';
			}

			const paddingLength: number			= Potassium.randomBytes(1)[0];

			const paddedPlaintext: Uint8Array	= new Uint8Array(
				1 + paddingLength + plaintext.length
			);

			paddedPlaintext.set(new Uint8Array([paddingLength]));
			paddedPlaintext.set(Potassium.randomBytes(paddingLength), 1);
			paddedPlaintext.set(plaintext, 1 + paddingLength);

			const nonce: Uint8Array	= this.newNonce(this.SecretBox.nonceBytes);

			let symmetricCyphertext: Uint8Array;

			for (let i = 0 ; i < key.length ; i += this.SecretBox.keyBytes) {
				const dataToEncrypt: Uint8Array	= symmetricCyphertext || paddedPlaintext;

				symmetricCyphertext	= await this.SecretBoxHelpers.seal(
					dataToEncrypt,
					nonce,
					new Uint8Array(key.buffer, i, this.SecretBox.keyBytes)
				);

				Potassium.clearMemory(dataToEncrypt);
			}

			const cyphertext: Uint8Array	= new Uint8Array(
				this.SecretBox.nonceBytes + symmetricCyphertext.length
			);

			cyphertext.set(nonce);
			cyphertext.set(symmetricCyphertext, this.SecretBox.nonceBytes);

			Potassium.clearMemory(nonce);
			Potassium.clearMemory(symmetricCyphertext);

			return cyphertext;
		},

		open: async (
			cyphertext: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			if (key.length % this.SecretBox.keyBytes !== 0) {
				throw 'Invalid key.';
			}

			cyphertext	= new Uint8Array(cyphertext);

			try {
				const nonce: Uint8Array					= new Uint8Array(
					cyphertext.buffer,
					0,
					this.SecretBox.nonceBytes
				);

				const symmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					this.SecretBox.nonceBytes
				);

				let paddedPlaintext: Uint8Array;

				for (
					let i = key.length - this.SecretBox.keyBytes;
					i >= 0;
					i -= this.SecretBox.keyBytes
				) {
					const dataToDecrypt: Uint8Array	= paddedPlaintext || symmetricCyphertext;

					paddedPlaintext	= await this.SecretBoxHelpers.open(
						dataToDecrypt,
						nonce,
						new Uint8Array(key.buffer, i, this.SecretBox.keyBytes)
					);

					Potassium.clearMemory(dataToDecrypt);
				}

				const plaintext: Uint8Array			= new Uint8Array(new Uint8Array(
					paddedPlaintext.buffer,
					1 + new Uint8Array(paddedPlaintext.buffer, 0, 1)[0]
				));

				Potassium.clearMemory(paddedPlaintext);
				Potassium.clearMemory(cyphertext);

				return plaintext;
			}
			finally {
				Potassium.clearMemory(cyphertext);
			}
		}
	};

	public Sign: {
		bytes: number;
		publicKeyBytes: number;
		privateKeyBytes: number;

		keyPair: () => Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}>;

		sign: (
			message: Uint8Array|string,
			privateKey: Uint8Array
		) => Promise<string>;

		signDetached: (
			message: Uint8Array|string,
			privateKey: Uint8Array
		) => Promise<string>;

		open: (
			signed: Uint8Array|string,
			publicKey: Uint8Array
		) => Promise<string>;

		verifyDetached: (
			signature: Uint8Array|string,
			message: Uint8Array|string,
			publicKey: Uint8Array
		) => Promise<boolean>;
	}	= Potassium.SuperSphincs;

	public constructor (
		private isCreator: boolean = true,
		private isNative: boolean = false,
		private counter: number = 0
	) {
		if (this.isNative) {
			this.Box.nonceBytes			= NativeCrypto.SecretBox.nonceBytes;
			this.Box.publicKeyBytes		=
				(
					this.Box.publicKeyBytes -
					Potassium.Sodium.crypto_box_PUBLICKEYBYTES
				) +
				NativeCrypto.Box.publicKeyBytes
			;
			this.Box.privateKeyBytes	=
				(
					this.Box.privateKeyBytes -
					Potassium.Sodium.crypto_box_SECRETKEYBYTES
				) +
				NativeCrypto.Box.privateKeyBytes
			;
			this.BoxHelpers.keyPair		= NativeCrypto.Box.keyPair;
			this.BoxHelpers.seal		= NativeCrypto.Box.seal;
			this.BoxHelpers.open		= NativeCrypto.Box.open;

			this.OneTimeAuth	= NativeCrypto.OneTimeAuth;

			this.PasswordHash.algorithm				=
				NativeCrypto.PasswordHash.algorithm.name + '/' +
				NativeCrypto.PasswordHash.algorithm.hash.name
			;
			this.PasswordHash.memLimitInteractive	=
				NativeCrypto.PasswordHash.memLimitInteractive
			;
			this.PasswordHash.memLimitSensitive		=
				NativeCrypto.PasswordHash.memLimitSensitive
			;
			this.PasswordHash.opsLimitInteractive	=
				NativeCrypto.PasswordHash.opsLimitInteractive
			;
			this.PasswordHash.opsLimitSensitive		=
				NativeCrypto.PasswordHash.opsLimitSensitive
			;
			this.PasswordHash.saltBytes				=
				NativeCrypto.PasswordHash.saltBytes
			;
			this.PasswordHashHelpers.hash			=
				NativeCrypto.PasswordHash.hash
			;

			this.SecretBox.keyBytes		= NativeCrypto.SecretBox.keyBytes;
			this.SecretBox.nonceBytes	= NativeCrypto.SecretBox.nonceBytes;
			this.SecretBoxHelpers.seal	= NativeCrypto.SecretBox.seal;
			this.SecretBoxHelpers.open	= NativeCrypto.SecretBox.open;
		}
	}
}
