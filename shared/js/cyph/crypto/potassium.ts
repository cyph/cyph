import {NativeCrypto} from './nativecrypto';
import {PotassiumUtil} from './potassiumutil';


/**
 * libsodium-inspired wrapper for the post-quantum primitives used by Cyph.
 * Outside of this class, libsodium and other cryptographic implementations
 * should generally not be called directly.
 */
export class Potassium extends PotassiumUtil {
	public static async isNativeCryptoSupported () : Promise<boolean> {
		try {
			await NativeCrypto.SecretBox.seal(
				Potassium.randomBytes(1),
				Potassium.randomBytes(NativeCrypto.SecretBox.nonceBytes),
				Potassium.randomBytes(NativeCrypto.SecretBox.keyBytes)
			);
			return true;
		}
		catch (_) {
			return false;
		}
	}


	/** @ignore */
	private newNonce (size: number) : Uint8Array {
		if (size < 4) {
			throw new Error('Nonce size too small.');
		}

		return Potassium.concatMemory(
			true,
			new Uint32Array([this.counter++]),
			Potassium.randomBytes(size - 4)
		);
	}

	/** @ignore */
	private BoxHelpers	= {
		publicKeyBytes: <number> Potassium.Sodium.crypto_box_PUBLICKEYBYTES,
		privateKeyBytes: <number> Potassium.Sodium.crypto_box_SECRETKEYBYTES,
		nonceBytes: <number> Potassium.Sodium.crypto_box_NONCEBYTES,

		keyPair: async () : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => Potassium.Sodium.crypto_box_keypair(),

		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_box_seal(
			plaintext,
			publicKey
		),

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			keyPair: {publicKey: Uint8Array; privateKey: Uint8Array;}
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_box_seal_open(
			cyphertext,
			keyPair.publicKey,
			keyPair.privateKey
		),

		publicKeyEncrypt: async (
			publicKey: Uint8Array,
			name: string,
			plaintextBytes: number,
			encrypt: (plaintext: Uint8Array, publicKey: Uint8Array) => Uint8Array
		) : Promise<{
			innerKeys: Uint8Array,
			symmetricKey: Uint8Array,
			keyCyphertext: Uint8Array
		}> => {
			if (plaintextBytes < (this.SecretBox.keyBytes + this.OneTimeAuth.keyBytes)) {
				throw new Error(`Not enough space for keys; must increase ${name} parameters.`);
			}

			const innerKeys: Uint8Array		= Potassium.randomBytes(plaintextBytes);

			const symmetricKey: Uint8Array	= new Uint8Array(
				innerKeys.buffer,
				0,
				this.SecretBox.keyBytes
			);

			const authKey: Uint8Array		= new Uint8Array(
				innerKeys.buffer,
				this.SecretBox.keyBytes,
				this.OneTimeAuth.keyBytes
			);

			const encryptedKeys: Uint8Array	= encrypt(
				innerKeys,
				publicKey
			);

			const mac: Uint8Array			= await this.OneTimeAuth.sign(
				encryptedKeys,
				authKey
			);

			return {
				innerKeys,
				symmetricKey,
				keyCyphertext: Potassium.concatMemory(
					true,
					encryptedKeys,
					mac
				)
			};
		},

		publicKeyDecrypt: async (
			keyCyphertext: Uint8Array,
			privateKey: Uint8Array,
			name: string,
			encryptedKeyBytes: number,
			decrypt: (cyphertext: Uint8Array, privateKey: Uint8Array) => Uint8Array
		) : Promise<{
			innerKeys: Uint8Array,
			symmetricKey: Uint8Array
		}> => {
			const encryptedKeys: Uint8Array	= new Uint8Array(
				keyCyphertext.buffer,
				keyCyphertext.byteOffset,
				encryptedKeyBytes
			);

			const mac: Uint8Array			= new Uint8Array(
				keyCyphertext.buffer,
				keyCyphertext.byteOffset + encryptedKeyBytes,
				this.OneTimeAuth.bytes
			);

			const innerKeys: Uint8Array		= decrypt(
				encryptedKeys,
				privateKey
			);

			const symmetricKey: Uint8Array	= new Uint8Array(
				innerKeys.buffer,
				0,
				this.SecretBox.keyBytes
			);

			const authKey: Uint8Array		= new Uint8Array(
				innerKeys.buffer,
				this.SecretBox.keyBytes,
				this.OneTimeAuth.keyBytes
			);

			const isValid: boolean			= await this.OneTimeAuth.verify(
				mac,
				encryptedKeys,
				authKey
			);

			if (!isValid) {
				Potassium.clearMemory(innerKeys);
				throw new Error(`Invalid ${name} cyphertext.`);
			}

			return {innerKeys, symmetricKey};
		},

		splitKeys: (publicKey?: Uint8Array, privateKey?: Uint8Array) => ({
			public: !publicKey ? null : {
				classical: new Uint8Array(
					publicKey.buffer,
					publicKey.byteOffset,
					this.BoxHelpers.publicKeyBytes
				),
				mceliece: new Uint8Array(
					publicKey.buffer,
					publicKey.byteOffset +
						this.BoxHelpers.publicKeyBytes
					,
					Potassium.McEliece.publicKeyLength
				),
				ntru: new Uint8Array(
					publicKey.buffer,
					publicKey.byteOffset +
						this.BoxHelpers.publicKeyBytes +
						Potassium.McEliece.publicKeyLength
					,
					Potassium.NTRU.publicKeyLength
				)
			},

			private: !privateKey ? null : {
				classical: new Uint8Array(
					privateKey.buffer,
					privateKey.byteOffset,
					this.BoxHelpers.privateKeyBytes
				),
				mceliece: new Uint8Array(
					privateKey.buffer,
					privateKey.byteOffset +
						this.BoxHelpers.privateKeyBytes
					,
					Potassium.McEliece.privateKeyLength
				),
				ntru: new Uint8Array(
					privateKey.buffer,
					privateKey.byteOffset +
						this.BoxHelpers.privateKeyBytes +
						Potassium.McEliece.privateKeyLength
					,
					Potassium.NTRU.privateKeyLength
				)
			}
		})
	};

	/** @ignore */
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

	/** @ignore */
	private SecretBoxHelpers	= {
		nonceBytes: <number> Potassium.Sodium.crypto_aead_chacha20poly1305_NPUBBYTES,

		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_aead_chacha20poly1305_encrypt(
			plaintext,
			additionalData,
			null,
			nonce,
			key
		),

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> => Potassium.Sodium.crypto_aead_chacha20poly1305_decrypt(
			null,
			cyphertext,
			additionalData,
			nonce,
			key
		),

		getAdditionalData: (input?: Uint8Array) : Uint8Array => {
			if (!input || input.length === this.SecretBox.aeadBytes) {
				return input;
			}

			if (input.length > this.SecretBox.aeadBytes) {
				throw new Error('Too much additional data.');
			}

			const output: Uint8Array	= new Uint8Array(this.SecretBox.aeadBytes);
			output.set(input);
			return output;
		}
	};

	public native () : boolean {
		return this.isNative;
	}

	public Box	= {
		publicKeyBytes: <number>
			Potassium.McEliece.publicKeyLength +
			Potassium.NTRU.publicKeyLength +
			this.BoxHelpers.publicKeyBytes
		,
		privateKeyBytes: <number>
			Potassium.McEliece.privateKeyLength +
			Potassium.NTRU.privateKeyLength +
			this.BoxHelpers.privateKeyBytes
		,

		keyPair: async () : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => {
			const keyPairs	= {
				classical: await this.BoxHelpers.keyPair(),
				mceliece: Potassium.McEliece.keyPair(),
				ntru: Potassium.NTRU.keyPair()
			};

			return {
				keyType: 'potassium-box',
				publicKey: Potassium.concatMemory(
					true,
					keyPairs.classical.publicKey,
					keyPairs.mceliece.publicKey,
					keyPairs.ntru.publicKey
				),
				privateKey: Potassium.concatMemory(
					true,
					keyPairs.classical.privateKey,
					keyPairs.mceliece.privateKey,
					keyPairs.ntru.privateKey
				)
			};
		},

		seal: async (
			plaintext: Uint8Array,
			publicKey: Uint8Array
		) : Promise<Uint8Array> => {
			const keys	= this.BoxHelpers.splitKeys(publicKey);

			const mcelieceData						= await this.BoxHelpers.publicKeyEncrypt(
				keys.public.mceliece,
				'McEliece',
				Potassium.McEliece.decryptedDataLength,
				Potassium.McEliece.encrypt
			);

			const ntruData							= await this.BoxHelpers.publicKeyEncrypt(
				keys.public.ntru,
				'NTRU',
				Potassium.NTRU.decryptedDataLength,
				Potassium.NTRU.encrypt
			);

			const nonce: Uint8Array					= this.newNonce(this.BoxHelpers.nonceBytes);

			const classicalCyphertext: Uint8Array	= await this.BoxHelpers.seal(
				plaintext,
				nonce,
				keys.public.classical
			);
			const ntruCyphertext: Uint8Array		= await this.SecretBox.seal(
				classicalCyphertext,
				ntruData.symmetricKey
			);
			const mcelieceCyphertext: Uint8Array	= await this.SecretBox.seal(
				ntruCyphertext,
				mcelieceData.symmetricKey
			);

			Potassium.clearMemory(ntruData.innerKeys);
			Potassium.clearMemory(mcelieceData.innerKeys);

			return Potassium.concatMemory(
				true,
				mcelieceData.keyCyphertext,
				ntruData.keyCyphertext,
				nonce,
				mcelieceCyphertext
			);
		},

		open: async (
			cyphertext: Uint8Array,
			keyPair: {publicKey: Uint8Array; privateKey: Uint8Array;}
		) : Promise<Uint8Array> => {
			const keys	= this.BoxHelpers.splitKeys(keyPair.publicKey, keyPair.privateKey);

			let cyphertextIndex	= cyphertext.byteOffset;

			const mcelieceData						= await this.BoxHelpers.publicKeyDecrypt(
				new Uint8Array(
					cyphertext.buffer,
					cyphertextIndex,
					Potassium.McEliece.encryptedDataLength +
						this.OneTimeAuth.bytes
				),
				keys.private.mceliece,
				'McEliece',
				Potassium.McEliece.encryptedDataLength,
				Potassium.McEliece.decrypt
			);

			cyphertextIndex +=
				Potassium.McEliece.encryptedDataLength +
				this.OneTimeAuth.bytes
			;

			const ntruData							= await this.BoxHelpers.publicKeyDecrypt(
				new Uint8Array(
					cyphertext.buffer,
					cyphertextIndex,
					Potassium.NTRU.encryptedDataLength +
						this.OneTimeAuth.bytes
				),
				keys.private.ntru,
				'NTRU',
				Potassium.NTRU.encryptedDataLength,
				Potassium.NTRU.decrypt
			);

			cyphertextIndex +=
				Potassium.NTRU.encryptedDataLength +
				this.OneTimeAuth.bytes
			;

			const nonce: Uint8Array					= new Uint8Array(
				cyphertext.buffer,
				cyphertextIndex,
				this.BoxHelpers.nonceBytes
			);

			cyphertextIndex += this.BoxHelpers.nonceBytes;

			const mcelieceCyphertext: Uint8Array	= new Uint8Array(
				cyphertext.buffer,
				cyphertextIndex,
				cyphertext.byteLength -
					(cyphertextIndex - cyphertext.byteOffset)
			);
			const ntruCyphertext: Uint8Array		= await this.SecretBox.open(
				mcelieceCyphertext,
				mcelieceData.symmetricKey
			);
			const classicalCyphertext: Uint8Array	= await this.SecretBox.open(
				ntruCyphertext,
				ntruData.symmetricKey
			);

			const plaintext: Uint8Array	= await this.BoxHelpers.open(
				classicalCyphertext,
				nonce,
				{
					publicKey: keys.public.classical,
					privateKey: keys.private.classical
				}
			);

			Potassium.clearMemory(mcelieceData.innerKeys);
			Potassium.clearMemory(ntruData.innerKeys);
			Potassium.clearMemory(ntruCyphertext);
			Potassium.clearMemory(classicalCyphertext);

			return plaintext;
		}
	};

	public EphemeralKeyExchange	= {
		publicKeyBytes: <number>
			Potassium.RLWE.publicKeyLength +
			Potassium.Sodium.crypto_scalarmult_BYTES
		,
		privateKeyBytes: <number>
			Potassium.RLWE.privateKeyLength +
			Potassium.Sodium.crypto_scalarmult_SCALARBYTES
		,
		secretBytes: <number> 64,

		aliceKeyPair: async () : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => {
			const rlweKeyPair: {
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}	= Potassium.RLWE.aliceKeyPair();

			const sodiumPrivateKey: Uint8Array	= Potassium.randomBytes(
				Potassium.Sodium.crypto_scalarmult_SCALARBYTES
			);

			const sodiumPublicKey: Uint8Array	=
				Potassium.Sodium.crypto_scalarmult_base(sodiumPrivateKey)
			;

			return {
				keyType: 'potassium-ephemeral',
				publicKey: Potassium.concatMemory(
					true,
					rlweKeyPair.publicKey,
					sodiumPublicKey
				),
				privateKey: Potassium.concatMemory(
					true,
					rlweKeyPair.privateKey,
					sodiumPrivateKey
				)
			};
		},

		aliceSecret: async (
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			const rlwePublicKey		= new Uint8Array(
				publicKey.buffer,
				publicKey.byteOffset,
				Potassium.RLWE.publicKeyLength
			);
			const sodiumPublicKey	= new Uint8Array(
				publicKey.buffer,
				publicKey.byteOffset + Potassium.RLWE.publicKeyLength,
				Potassium.Sodium.crypto_scalarmult_BYTES
			);

			const rlwePrivateKey	= new Uint8Array(
				privateKey.buffer,
				privateKey.byteOffset,
				Potassium.RLWE.privateKeyLength
			);
			const sodiumPrivateKey	= new Uint8Array(
				privateKey.buffer,
				privateKey.byteOffset + Potassium.RLWE.privateKeyLength,
				Potassium.Sodium.crypto_scalarmult_SCALARBYTES
			);

			const rlweSecret: Uint8Array	= Potassium.RLWE.aliceSecret(
				rlwePublicKey,
				rlwePrivateKey
			);

			const sodiumSecret: Uint8Array	= Potassium.Sodium.crypto_scalarmult(
				sodiumPrivateKey,
				sodiumPublicKey
			);

			return this.Hash.deriveKey(
				Potassium.concatMemory(
					true,
					rlweSecret,
					sodiumSecret
				),
				this.EphemeralKeyExchange.secretBytes,
				true
			);
		},

		bobSecret: async (alicePublicKey: Uint8Array) : Promise<{
			publicKey: Uint8Array;
			secret: Uint8Array;
		}> => {
			const aliceRlwePublicKey	= new Uint8Array(
				alicePublicKey.buffer,
				alicePublicKey.byteOffset,
				Potassium.RLWE.publicKeyLength
			);
			const aliceSodiumPublicKey	= new Uint8Array(
				alicePublicKey.buffer,
				alicePublicKey.byteOffset + Potassium.RLWE.publicKeyLength,
				Potassium.Sodium.crypto_scalarmult_BYTES
			);

			const rlweSecretData: {
				publicKey: Uint8Array;
				secret: Uint8Array;
			}	= Potassium.RLWE.bobSecret(aliceRlwePublicKey);

			const sodiumPrivateKey: Uint8Array	= Potassium.randomBytes(
				Potassium.Sodium.crypto_scalarmult_SCALARBYTES
			);
			const sodiumPublicKey: Uint8Array	=
				Potassium.Sodium.crypto_scalarmult_base(sodiumPrivateKey)
			;
			const sodiumSecret: Uint8Array		= Potassium.Sodium.crypto_scalarmult(
				sodiumPrivateKey,
				aliceSodiumPublicKey
			);

			Potassium.clearMemory(sodiumPrivateKey);

			return {
				publicKey: Potassium.concatMemory(
					true,
					rlweSecretData.publicKey,
					sodiumPublicKey
				),
				secret: await this.Hash.deriveKey(
					Potassium.concatMemory(
						true,
						rlweSecretData.secret,
						sodiumSecret
					),
					this.EphemeralKeyExchange.secretBytes,
					true
				)
			};
		}
	};

	public Hash	= {
		bytes: <number> Potassium.SuperSphincs.hashBytes,

		hash: async (plaintext: Uint8Array|string) : Promise<Uint8Array> => {
			return Potassium.SuperSphincs.hash(plaintext, true);
		},

		deriveKey: async (
			input: Uint8Array,
			outputBytes?: number,
			clearInput?: boolean
		) : Promise<Uint8Array> => {
			if (!outputBytes) {
				outputBytes	= input.length;
			}

			if (outputBytes > Potassium.SuperSphincs.hashBytes) {
				throw new Error('Potassium.Hash.deriveKey output cannot exceed 64 bytes.');
			}

			const hash	= this.isNative ?
				new Uint8Array((await this.Hash.hash(input)).buffer, 0, outputBytes) :
				Potassium.Sodium.crypto_generichash(outputBytes, input)
			;

			if (clearInput) {
				Potassium.clearMemory(input);
			}

			return hash;
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
			memLimit: number = this.PasswordHash.memLimitInteractive,
			clearInput?: boolean
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

				const metadata: Uint8Array	= Potassium.concatMemory(
					false,
					new Uint8Array(new Uint32Array([memLimit]).buffer),
					new Uint8Array(new Uint32Array([opsLimit]).buffer),
					new Uint8Array(new Uint32Array([salt.length]).buffer),
					salt,
					algorithm
				);

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
				if (clearInput) {
					Potassium.clearMemory(plaintextBinary);
					Potassium.clearMemory(salt);
				}
				else if (typeof plaintext !== 'Uint8Array') {
					Potassium.clearMemory(plaintextBinary);
				}
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
					salt: new Uint8Array(new Uint8Array(metadata.buffer, 12, saltBytes))
				};
			}
			finally {
				Potassium.clearMemory(metadata);
			}
		}
	};

	public SecretBox	= {
		aeadBytes: <number> Potassium.Sodium.crypto_aead_chacha20poly1305_ABYTES,
		keyBytes: <number> Potassium.Sodium.crypto_aead_chacha20poly1305_KEYBYTES,

		seal: async (
			plaintext: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> => {
			if (key.length % this.SecretBox.keyBytes !== 0) {
				throw new Error('Invalid key.');
			}

			const paddingLength: number			= Potassium.randomBytes(1)[0];

			const paddedPlaintext: Uint8Array	= Potassium.concatMemory(
				false,
				new Uint8Array([paddingLength]),
				Potassium.randomBytes(paddingLength),
				plaintext
			);

			const nonce: Uint8Array	= this.newNonce(this.SecretBoxHelpers.nonceBytes);

			let symmetricCyphertext: Uint8Array;

			for (let i = 0 ; i < key.length ; i += this.SecretBox.keyBytes) {
				const dataToEncrypt: Uint8Array	= symmetricCyphertext || paddedPlaintext;

				symmetricCyphertext	= await this.SecretBoxHelpers.seal(
					dataToEncrypt,
					nonce,
					new Uint8Array(
						key.buffer,
						key.byteOffset + i,
						this.SecretBox.keyBytes
					),
					this.SecretBoxHelpers.getAdditionalData(additionalData)
				);

				Potassium.clearMemory(dataToEncrypt);
			}

			return Potassium.concatMemory(
				true,
				nonce,
				symmetricCyphertext
			);
		},

		open: async (
			cyphertext: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> => {
			if (key.length % this.SecretBox.keyBytes !== 0) {
				throw new Error('Invalid key.');
			}

			cyphertext	= new Uint8Array(cyphertext);

			try {
				const nonce: Uint8Array					= new Uint8Array(
					cyphertext.buffer,
					0,
					this.SecretBoxHelpers.nonceBytes
				);

				const symmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					this.SecretBoxHelpers.nonceBytes
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
						new Uint8Array(
							key.buffer,
							key.byteOffset + i,
							this.SecretBox.keyBytes
						),
						this.SecretBoxHelpers.getAdditionalData(additionalData)
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

	/**
	 * @param isNative If true, will use NativeCrypto instead of libsodium.
	 * @param counter Initial value of counter for nonces.
	 */
	constructor (
		/** @ignore */
		private isNative: boolean = false,

		/** @ignore */
		private counter: number = 0
	) {
		super();

		if (this.isNative) {
			this.BoxHelpers.nonceBytes		= NativeCrypto.SecretBox.nonceBytes;
			this.Box.publicKeyBytes			-= this.BoxHelpers.publicKeyBytes;
			this.BoxHelpers.publicKeyBytes	= NativeCrypto.Box.publicKeyBytes;
			this.Box.publicKeyBytes			+= this.BoxHelpers.publicKeyBytes;
			this.Box.privateKeyBytes		-= this.BoxHelpers.privateKeyBytes;
			this.BoxHelpers.privateKeyBytes	= NativeCrypto.Box.privateKeyBytes;
			this.Box.privateKeyBytes		+= this.BoxHelpers.privateKeyBytes;
			this.BoxHelpers.keyPair			= NativeCrypto.Box.keyPair;
			this.BoxHelpers.seal			= NativeCrypto.Box.seal;
			this.BoxHelpers.open			= NativeCrypto.Box.open;

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

			this.SecretBoxHelpers.nonceBytes	= NativeCrypto.SecretBox.nonceBytes;
			this.SecretBox.aeadBytes			= NativeCrypto.SecretBox.aeadBytes;
			this.SecretBox.keyBytes				= NativeCrypto.SecretBox.keyBytes;
			this.SecretBoxHelpers.seal			= NativeCrypto.SecretBox.seal;
			this.SecretBoxHelpers.open			= NativeCrypto.SecretBox.open;
		}
	}
}
