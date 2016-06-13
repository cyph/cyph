import {NativeCrypto} from 'nativecrypto';


/**
 * libsodium-inspired wrapper for the post-quantum primitives used by Cyph.
 * Outside of this class, libsodium and other cryptographic implementations
 * should generally not be called directly.
 */
export class Potassium {
	private static Ntru			= self['ntru'] || {};
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
			Potassium.Sodium.to_base64(a).replace(/\n/g, '')
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


	private BoxHelpers	= {
		keyPair: <() => any> Potassium.Sodium.crypto_box_keypair,

		seal: <(
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) => any> Potassium.Sodium.crypto_box_easy,

		open: <(
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) => any> Potassium.Sodium.crypto_box_open_easy
	};

	private PasswordHashHelpers	= {
		hash: (
			plaintext: Uint8Array,
			salt: Uint8Array,
			outputBytes: number,
			opsLimit: number,
			memLimit: number
		) : any => Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256(
			outputBytes,
			plaintext,
			salt,
			opsLimit,
			memLimit
		)
	};

	private SecretBoxHelpers	= {
		seal: <(
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array
		) => any> Potassium.Sodium.crypto_secretbox_easy,

		open: <(
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array
		) => any> Potassium.Sodium.crypto_secretbox_open_easy
	};

	public native () : boolean {
		return this.isNative;
	}

	public Box	= {
		nonceBytes: <number> Potassium.Sodium.crypto_box_NONCEBYTES,
		publicKeyBytes: <number>
			Potassium.Ntru.publicKeyLength +
			Potassium.Sodium.crypto_box_PUBLICKEYBYTES
		,
		privateKeyBytes: <number>
			Potassium.Ntru.privateKeyLength +
			Potassium.Sodium.crypto_box_SECRETKEYBYTES
		,

		keyPair: () : Promise<{
			keyType: string;
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}> => {
			return Promise.resolve().then(() =>
				this.BoxHelpers.keyPair()
			).then((altKeyPair: {
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}) => {
				const ntruKeyPair: {
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				}	= Potassium.Ntru.keyPair();

				const keyPair: {
					keyType: string;
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				}	= {
					keyType: 'potassium',
					publicKey: new Uint8Array(this.Box.publicKeyBytes),
					privateKey: new Uint8Array(this.Box.privateKeyBytes)
				};

				keyPair.publicKey.set(ntruKeyPair.publicKey);
				keyPair.privateKey.set(altKeyPair.privateKey, Potassium.Ntru.privateKeyLength);
				keyPair.privateKey.set(ntruKeyPair.privateKey);
				keyPair.publicKey.set(altKeyPair.publicKey, Potassium.Ntru.publicKeyLength);

				Potassium.clearMemory(ntruKeyPair.privateKey);
				Potassium.clearMemory(altKeyPair.privateKey);
				Potassium.clearMemory(ntruKeyPair.publicKey);
				Potassium.clearMemory(altKeyPair.publicKey);

				return keyPair;
			});
		},

		seal: (
			plaintext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			return Promise.resolve().then(() => {
				publicKey	= new Uint8Array(publicKey);
				privateKey	= new Uint8Array(privateKey);

				const publicKeys	= {
					ntru: new Uint8Array(publicKey.buffer, 0, Potassium.Ntru.publicKeyLength),
					alt: new Uint8Array(publicKey.buffer, Potassium.Ntru.publicKeyLength)
				};

				const privateKeys	= {
					ntru: new Uint8Array(privateKey.buffer, 0, Potassium.Ntru.privateKeyLength),
					alt: new Uint8Array(privateKey.buffer, Potassium.Ntru.privateKeyLength)
				};

				const nonce: Uint8Array				= Potassium.randomBytes(
					this.Box.nonceBytes
				);

				const ntruPlaintext: Uint8Array		= Potassium.randomBytes(
					this.SecretBox.keyBytes + this.OneTimeAuth.keyBytes
				);

				const ntruAuthKey: Uint8Array		= new Uint8Array(
					ntruPlaintext.buffer,
					this.SecretBox.keyBytes
				);

				const ntruCyphertext: Uint8Array	= Potassium.Ntru.encrypt(
					ntruPlaintext,
					publicKeys.ntru
				);

				return Promise.all([
					nonce,
					ntruPlaintext,
					ntruCyphertext,
					this.BoxHelpers.seal(
						plaintext,
						nonce,
						publicKeys.alt,
						privateKeys.alt
					),
					this.OneTimeAuth.sign(
						ntruCyphertext,
						ntruAuthKey
					)
				]);
			}).then(results => {
				const nonce: Uint8Array				= results[0];
				const ntruPlaintext: Uint8Array		= results[1];
				const ntruCyphertext: Uint8Array	= results[2];
				const altCyphertext: Uint8Array		= results[3];
				const ntruMac: Uint8Array			= results[4];

				const symmetricKey: Uint8Array		= new Uint8Array(
					ntruPlaintext.buffer,
					0,
					this.SecretBox.keyBytes
				);

				Potassium.clearMemory(privateKey);
				Potassium.clearMemory(publicKey);

				return Promise.all([
					nonce,
					ntruPlaintext,
					ntruCyphertext,
					altCyphertext,
					ntruMac,
					this.SecretBox.seal(
						altCyphertext,
						symmetricKey
					)
				]);
			}).then(results => {
				const nonce: Uint8Array					= results[0];
				const ntruPlaintext: Uint8Array			= results[1];
				const ntruCyphertext: Uint8Array		= results[2];
				const altCyphertext: Uint8Array			= results[3];
				const ntruMac: Uint8Array				= results[4];
				const symmetricCyphertext: Uint8Array	= results[5];

				const cyphertext: Uint8Array	= new Uint8Array(
					Potassium.Ntru.encryptedDataLength +
					this.OneTimeAuth.bytes +
					this.Box.nonceBytes +
					symmetricCyphertext.length
				);

				cyphertext.set(ntruCyphertext);
				cyphertext.set(
					ntruMac,
					Potassium.Ntru.encryptedDataLength
				);
				cyphertext.set(
					nonce,
					Potassium.Ntru.encryptedDataLength +
						this.OneTimeAuth.bytes
				);
				cyphertext.set(
					symmetricCyphertext,
					Potassium.Ntru.encryptedDataLength +
						this.OneTimeAuth.bytes +
						this.Box.nonceBytes
				);

				Potassium.clearMemory(nonce);
				Potassium.clearMemory(ntruPlaintext);
				Potassium.clearMemory(ntruCyphertext);
				Potassium.clearMemory(altCyphertext);
				Potassium.clearMemory(ntruMac);
				Potassium.clearMemory(symmetricCyphertext);

				return cyphertext;
			}).catch(err => {
				Potassium.clearMemory(privateKey);
				Potassium.clearMemory(publicKey);

				throw err;
			});
		},

		open: (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Promise<Uint8Array> => {
			return Promise.resolve().then(() => {
				cyphertext	= new Uint8Array(cyphertext);
				publicKey	= new Uint8Array(publicKey);
				privateKey	= new Uint8Array(privateKey);

				const privateKeys	= {
					ntru: new Uint8Array(privateKey.buffer, 0, Potassium.Ntru.privateKeyLength),
					alt: new Uint8Array(privateKey.buffer, Potassium.Ntru.privateKeyLength)
				};

				const ntruCyphertext: Uint8Array		= new Uint8Array(
					cyphertext.buffer,
					0,
					Potassium.Ntru.encryptedDataLength
				);

				const ntruMac: Uint8Array				= new Uint8Array(
					cyphertext.buffer,
					Potassium.Ntru.encryptedDataLength,
					this.OneTimeAuth.bytes
				);

				const symmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					Potassium.Ntru.encryptedDataLength +
						this.OneTimeAuth.bytes +
						this.SecretBox.nonceBytes
				);

				const ntruPlaintext: Uint8Array	= Potassium.Ntru.decrypt(
					ntruCyphertext,
					privateKeys.ntru
				);

				const symmetricKey: Uint8Array	= new Uint8Array(
					ntruPlaintext.buffer,
					0,
					this.SecretBox.keyBytes
				);

				const ntruAuthKey: Uint8Array	= new Uint8Array(
					ntruPlaintext.buffer,
					this.SecretBox.keyBytes
				);

				return Promise.all([
					privateKeys,
					ntruPlaintext,
					this.SecretBox.open(
						symmetricCyphertext,
						symmetricKey
					),
					this.OneTimeAuth.verify(
						ntruMac,
						ntruCyphertext,
						ntruAuthKey
					)
				]);
			}).then(results => {
				const privateKeys: {alt: Uint8Array; ntru: Uint8Array;}	= results[0];
				const ntruPlaintext: Uint8Array							= results[1];
				const altCyphertext: Uint8Array							= results[2];
				const isValid: boolean									= results[3];

				const publicKeys	= {
					ntru: new Uint8Array(publicKey.buffer, 0, Potassium.Ntru.publicKeyLength),
					alt: new Uint8Array(publicKey.buffer, Potassium.Ntru.publicKeyLength)
				};

				const nonce: Uint8Array					= new Uint8Array(
					cyphertext.buffer,
					Potassium.Ntru.encryptedDataLength + this.OneTimeAuth.bytes,
					this.SecretBox.nonceBytes
				);

				Potassium.clearMemory(ntruPlaintext);

				if (!isValid) {
					Potassium.clearMemory(altCyphertext);
					throw new Error('Invalid NTRU cyphertext.')
				}
				else {
					return Promise.all([
						altCyphertext,
						this.BoxHelpers.open(
							altCyphertext,
							nonce,
							publicKeys.alt,
							privateKeys.alt
						)
					]);
				}
			}).then(results => {
				const altCyphertext: Uint8Array	= results[0];
				const plaintext: Uint8Array		= results[1];

				Potassium.clearMemory(altCyphertext);
				Potassium.clearMemory(cyphertext);
				Potassium.clearMemory(publicKey);
				Potassium.clearMemory(privateKey);

				return plaintext;
			}).catch(err => {
				Potassium.clearMemory(cyphertext);
				Potassium.clearMemory(publicKey);
				Potassium.clearMemory(privateKey);

				throw err;
			});
		}
	};

	public Hash	= {
		bytes: <number> Potassium.SuperSphincs.hashLength,

		hash: (plaintext: Uint8Array|string) : Promise<Uint8Array> => {
			return Potassium.SuperSphincs.hash(plaintext).then(hash => hash.binary);
		}
	};

	public OneTimeAuth	= {
		bytes: <number> Potassium.Sodium.crypto_onetimeauth_BYTES,
		keyBytes: <number> Potassium.Sodium.crypto_onetimeauth_KEYBYTES,

		sign: (
			message: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return Promise.resolve().then(() => Potassium.Sodium.crypto_onetimeauth(
				message,
				key
			));
		},

		verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) : Promise<boolean> => {
			return Promise.resolve().then(() => Potassium.Sodium.crypto_onetimeauth_verify(
				mac,
				message,
				key
			));
		}
	};

	public PasswordHash	= {
		algorithm: 'scrypt',
		memLimitInteractive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE,
		memLimitSensitive: <number> 134217728 /* 128 MB */,
		opsLimitInteractive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE,
		opsLimitSensitive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
		saltBytes: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES,

		hash: (
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
			let plaintextBinary: Uint8Array;
			const shouldClearPlaintextBinary: boolean	= typeof plaintext === 'string';

			return Promise.resolve().then(() => {
				plaintextBinary	= Potassium.fromString(plaintext);

				return this.PasswordHashHelpers.hash(
					plaintextBinary,
					salt,
					outputBytes,
					opsLimit,
					memLimit
				);
			}).then((hash: Uint8Array) => {
				if (shouldClearPlaintextBinary) {
					Potassium.clearMemory(plaintextBinary);
				}

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
					hash,
					metadata,
					metadataObject: {
						algorithm: this.PasswordHash.algorithm,
						memLimit,
						opsLimit,
						salt
					}
				};
			}).catch(err => {
				if (shouldClearPlaintextBinary) {
					Potassium.clearMemory(plaintextBinary);
				}

				throw err;
			});
		},

		parseMetadata: (metadata: Uint8Array) : Promise<{
			algorithm: string;
			memLimit: number;
			opsLimit: number;
			salt: Uint8Array;
		}> => {
			return Promise.resolve().then(() => {
				metadata	= new Uint8Array(metadata);

				const saltBytes: number	= new Uint32Array(metadata.buffer, 2, 1)[0];

				const metadataObject	= {
					algorithm: Potassium.toString(new Uint8Array(metadata.buffer, 12 + saltBytes)),
					memLimit: new Uint32Array(metadata.buffer, 0, 1)[0],
					opsLimit: new Uint32Array(metadata.buffer, 1, 1)[0],
					salt: new Uint8Array(new Uint8Array(metadata.buffer, 12, saltBytes)),
				};

				Potassium.clearMemory(metadata);

				return metadataObject;
			}).catch(err => {
				Potassium.clearMemory(metadata);

				throw err;
			});
		}
	};

	public SecretBox	= {
		keyBytes: <number> Potassium.Sodium.crypto_secretbox_KEYBYTES,
		nonceBytes: <number> Potassium.Sodium.crypto_secretbox_NONCEBYTES,

		seal: (
			plaintext: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return Promise.resolve().then(() => {
				const nonce: Uint8Array	= Potassium.randomBytes(
					this.SecretBox.nonceBytes
				);

				const paddingLength: number			= Potassium.randomBytes(1)[0];

				const paddedPlaintext: Uint8Array	= new Uint8Array(
					1 + paddingLength + plaintext.length
				);

				paddedPlaintext.set(new Uint8Array([paddingLength]));
				paddedPlaintext.set(Potassium.randomBytes(paddingLength), 1);
				paddedPlaintext.set(plaintext, 1 + paddingLength);

				return Promise.all([
					nonce,
					paddedPlaintext,
					this.SecretBoxHelpers.seal(
						paddedPlaintext,
						nonce,
						key
					)
				]);
			}).then(results => {
				const nonce: Uint8Array					= results[0];
				const paddedPlaintext: Uint8Array		= results[1];
				const symmetricCyphertext: Uint8Array	= results[2];

				const cyphertext: Uint8Array	= new Uint8Array(
					this.SecretBox.nonceBytes + symmetricCyphertext.length
				);

				cyphertext.set(nonce);
				cyphertext.set(symmetricCyphertext, this.SecretBox.nonceBytes);

				Potassium.clearMemory(paddedPlaintext);
				Potassium.clearMemory(nonce);
				Potassium.clearMemory(symmetricCyphertext);

				return cyphertext;
			});
		},

		open: (
			cyphertext: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => {
			return Promise.resolve().then(() => {
				cyphertext	= new Uint8Array(cyphertext);

				const nonce: Uint8Array					= new Uint8Array(
					cyphertext.buffer,
					0,
					this.SecretBox.nonceBytes
				);

				const symmetricCyphertext: Uint8Array	= new Uint8Array(
					cyphertext.buffer,
					this.SecretBox.nonceBytes
				);

				return this.SecretBoxHelpers.open(
					symmetricCyphertext,
					nonce,
					key
				);
			}).then((paddedPlaintext: Uint8Array) => {
				const plaintext: Uint8Array	= new Uint8Array(new Uint8Array(
					paddedPlaintext.buffer,
					1 + new Uint8Array(paddedPlaintext.buffer, 0, 1)[0]
				));

				Potassium.clearMemory(paddedPlaintext);
				Potassium.clearMemory(cyphertext);

				return plaintext;
			}).catch(err => {
				Potassium.clearMemory(cyphertext);

				throw err;
			});
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

	public constructor (private isNative: boolean = false) {
		if (this.isNative) {
			this.Box.nonceBytes			= NativeCrypto.SecretBox.nonceBytes;
			this.Box.publicKeyBytes		=
				Potassium.Ntru.publicKeyLength +
				NativeCrypto.Box.publicKeyBytes
			;
			this.Box.privateKeyBytes	=
				Potassium.Ntru.privateKeyLength +
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
