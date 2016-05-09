import {NativeCrypto} from 'nativecrypto';


/**
 * libsodium-inspired wrapper for the post-quantum primitives used by Cyph.
 * Outside of this class, libsodium and other cryptographic implementations
 * should generally not be called directly.
 */
export class Potassium {
	private static Ntru			= self['ntru'];
	private static Sodium		= self['sodium'];
	private static SuperSphincs	= self['superSphincs'];

	public static clearMemory (a: Uint8Array) : void {
		Potassium.Sodium.memzero(a);
	}

	public static compareMemory (a: Uint8Array, b: Uint8Array) : boolean {
		return a.length === b.length && Potassium.Sodium.memcmp(a, b);
	}

	public static fromBase64 (s: string | Uint8Array) : Uint8Array {
		return typeof s === 'string' ?
			Potassium.Sodium.from_base64(s) :
			s
		;
	}

	public static fromHex (s: string | Uint8Array) : Uint8Array {
		return typeof s === 'string' ?
			Potassium.Sodium.from_hex(s) :
			s
		;
	}

	public static fromString (s: string | Uint8Array) : Uint8Array {
		return typeof s === 'string' ?
			Potassium.Sodium.from_string(s) :
			s
		;
	}

	public static randomBytes (n: number) : Uint8Array {
		return Potassium.Sodium.randombytes_buf(n);
	}

	public static toBase64 (a: Uint8Array | string) : string {
		return typeof a === 'string' ?
			a :
			Potassium.Sodium.to_base64(a).replace(/\n/g, '')
		;
	}

	public static toHex (a: Uint8Array | string) : string {
		return typeof a === 'string' ?
			a :
			Potassium.Sodium.to_hex(a)
		;
	}

	public static toString (a: Uint8Array | string) : string {
		return typeof a === 'string' ?
			a :
			Potassium.Sodium.to_string(a)
		;
	}


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

		keyPair: (
			callback: (keyPair: {
				keyType: string;
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}) => void
		) : void => {
			const generateKeyPair	= (altKeyPair: {
				keyType: string;
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}) : void => {
				const ntruKeyPair	= Potassium.Sodium.Ntru.keyPair();

				const keyPair	= {
					keyType: 'potassium',
					publicKey: new Uint8Array(this.Box.publicKeyBytes),
					privateKey: new Uint8Array(this.Box.privateKeyBytes)
				};

				keyPair.publicKey.set(ntruKeyPair.publicKey);
				keyPair.privateKey.set(ntruKeyPair.privateKey);
				keyPair.publicKey.set(altKeyPair.publicKey, Potassium.Ntru.publicKeyLength);
				keyPair.privateKey.set(altKeyPair.privateKey, Potassium.Ntru.privateKeyLength);

				try {
					callback(keyPair);
				}
				finally {
					Potassium.clearMemory(ntruKeyPair.privateKey);
					Potassium.clearMemory(altKeyPair.privateKey);
					Potassium.clearMemory(ntruKeyPair.publicKey);
					Potassium.clearMemory(altKeyPair.publicKey);
				}
			};

			if (this.isNative) {
				NativeCrypto.Box.keyPair(generateKeyPair);
			}
			else {
				generateKeyPair(Potassium.Sodium.crypto_box_keypair());
			}
		},

		seal: (
			plaintext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (cyphertext: Uint8Array) => void
		) : void => {
			const publicKeys	= {
				ntru: new Uint8Array(publicKey.buffer, 0, Potassium.Ntru.publicKeyLength),
				alt: new Uint8Array(publicKey.buffer, Potassium.Ntru.publicKeyLength)
			};

			const privateKeys	= {
				ntru: new Uint8Array(privateKey.buffer, 0, Potassium.Ntru.privateKeyLength),
				alt: new Uint8Array(privateKey.buffer, Potassium.Ntru.privateKeyLength)
			};

			const nonce: Uint8Array	= Potassium.randomBytes(
				this.Box.nonceBytes
			);

			const encryptData	= (altCyphertext: Uint8Array) : void => {
				const symmetricKey: Uint8Array		= Potassium.randomBytes(
					this.SecretBox.keyBytes
				);

				const ntruAuthKey: Uint8Array		= Potassium.randomBytes(
					this.OneTimeAuth.keyBytes
				);

				const ntruPlaintext: Uint8Array		= new Uint8Array(
					this.SecretBox.keyBytes + this.OneTimeAuth.keyBytes
				);

				ntruPlaintext.set(symmetricKey);
				ntruPlaintext.set(ntruAuthKey, this.SecretBox.keyBytes);

				const ntruCyphertext: Uint8Array	= Ntru.encrypt(
					ntruPlaintext,
					publicKeys.ntru
				);

				this.OneTimeAuth.sign(
					ntruCyphertext,
					ntruAuthKey,
					(ntruMac: Uint8Array) : void => this.SecretBox.seal(
						altCyphertext,
						symmetricKey,
						(symmetricCyphertext: Uint8Array) : void => {
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

							try {
								callback(cyphertext);
							}
							finally {
								Potassium.clearMemory(nonce);
								Potassium.clearMemory(altCyphertext);
								Potassium.clearMemory(symmetricKey);
								Potassium.clearMemory(ntruAuthKey);
								Potassium.clearMemory(ntruPlaintext);
								Potassium.clearMemory(ntruCyphertext);
								Potassium.clearMemory(symmetricCyphertext);
							}
						}
					)
				);
			};

			if (this.isNative) {
				NativeCrypto.Box.seal(
					plaintext,
					nonce,
					publicKeys.alt,
					privateKeys.alt,
					encryptData
				);
			}
			else {
				encryptData(Potassium.Sodium.crypto_box_easy(
					plaintext,
					nonce,
					publicKeys.alt,
					privateKeys.alt
				));
			}
		},

		open: (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (plaintext: Uint8Array) => void
		) : void => {
			const publicKeys	= {
				ntru: new Uint8Array(publicKey.buffer, 0, Potassium.Ntru.publicKeyLength),
				alt: new Uint8Array(publicKey.buffer, Potassium.Ntru.publicKeyLength)
			};

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

			const nonce: Uint8Array					= new Uint8Array(
				cyphertext.buffer,
				Potassium.Ntru.encryptedDataLength + this.OneTimeAuth.bytes,
				this.SecretBox.nonceBytes
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

			this.OneTimeAuth.verify(
				ntruMac,
				ntruCyphertext,
				ntruAuthKey,
				(isValid: boolean) : void => {
					if (!isValid) {
						throw new Error('Invalid NTRU cyphertext.')
					}

					this.SecretBox.open(
						symmetricCyphertext,
						symmetricKey,
						(altCyphertext: Uint8Array) : void => {
							try {
								if (this.isNative) {
									NativeCrypto.Box.open(
										altCyphertext,
										nonce,
										publicKeys.alt,
										privateKeys.alt,
										callback
									);
								}
								else {
									callback(Potassium.Sodium.crypto_box_open_easy(
										altCyphertext,
										nonce,
										publicKeys.alt,
										privateKeys.alt
									));
								}
							}
							finally {
								Potassium.clearMemory(ntruPlaintext);
								Potassium.clearMemory(altCyphertext);
							}
						}
					);
				}
			);
		}
	};

	public OneTimeAuth	= {
		bytes: <number> Potassium.Sodium.crypto_onetimeauth_BYTES,
		keyBytes: <number> Potassium.Sodium.crypto_onetimeauth_KEYBYTES,

		sign: (
			message: Uint8Array,
			key: Uint8Array,
			callback: (mac: Uint8Array) => void
		) : void => {
			callback(Potassium.Sodium.crypto_onetimeauth(
				message,
				key
			));
		},

		verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array,
			callback: (isValid: boolean) => void
		) : void => {
			callback(Potassium.Sodium.crypto_onetimeauth_verify(
				mac,
				message,
				key
			));
		}
	};

	public PasswordHash	= {
		memLimitInteractive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE,
		memLimitSensitive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_SENSITIVE,
		opsLimitInteractive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE,
		opsLimitSensitive: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
		saltBytes: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES,

		getHashData: (
			completeHash: Uint8Array,
			callback: (
				hash: Uint8Array,
				salt: Uint8Array,
				outputBytes: number,
				opsLimit: number,
				memLimit: number
			) => void
		) : void => {
			const outputBytes: number	= new Uint32Array(completeHash.buffer, 0, 1)[0];

			callback(
				new Uint8Array(new Uint8Array(completeHash.buffer, 12, outputBytes)),
				new Uint8Array(new Uint8Array(completeHash.buffer, 12 + outputBytes)),
				outputBytes,
				new Uint32Array(completeHash.buffer, 1, 1)[0],
				new Uint32Array(completeHash.buffer, 2, 1)[0]
			);
		},

		hash: (
			plaintext: Uint8Array,
			salt: Uint8Array = Potassium.randomBytes(
				this.PasswordHash.saltBytes
			),
			outputBytes: number = this.SecretBox.keyBytes,
			opsLimit: number = this.PasswordHash.opsLimitInteractive,
			memLimit: number = this.PasswordHash.memLimitInteractive,
			callback: (
				completeHash: Uint8Array,
				hash: Uint8Array,
				salt: Uint8Array,
				outputBytes: number,
				opsLimit: number,
				memLimit: number
			) => void
		) : void => {
			const addMetadataToHash	= (hash: Uint8Array) : void => {
				const completeHash: Uint8Array	= new Uint8Array(
					12 + outputBytes + salt.length
				);

				completeHash.set(new Uint8Array(new Uint32Array([outputBytes]).buffer));
				completeHash.set(new Uint8Array(new Uint32Array([opsLimit]).buffer), 4);
				completeHash.set(new Uint8Array(new Uint32Array([memLimit]).buffer), 8);
				completeHash.set(hash, 12);
				completeHash.set(salt, 12 + outputBytes);

				callback(
					completeHash,
					hash,
					salt,
					outputBytes,
					opsLimit,
					memLimit
				);
			};

			if (this.isNative) {
				NativeCrypto.PasswordHash.hash(
					plaintext,
					salt,
					outputBytes,
					opsLimit,
					memLimit,
					addMetadataToHash
				);
			}
			else {
				addMetadataToHash(Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256(
					outputBytes,
					plaintext,
					salt,
					opsLimit,
					memLimit
				));
			}
		}
	};

	public SecretBox	= {
		keyBytes: <number> Potassium.Sodium.crypto_secretbox_KEYBYTES,
		nonceBytes: <number> Potassium.Sodium.crypto_secretbox_NONCEBYTES,

		seal: (
			plaintext: Uint8Array,
			key: Uint8Array,
			callback: (cyphertext: Uint8Array) => void
		) : void => {
			const nonce: Uint8Array	= Potassium.randomBytes(
				this.SecretBox.nonceBytes
			);

			const paddingLength: number			= Potassium.randomBytes(1)[0];

			const paddedPlaintext: Uint8Array	= new Uint8Array(
				1 + paddingLength + plaintext.length
			);

			const processData	= (symmetricCyphertext: Uint8Array) : void => {
				const cyphertext: Uint8Array	= new Uint8Array(
					this.SecretBox.nonceBytes + symmetricCyphertext.length
				);

				cyphertext.set(nonce);
				cyphertext.set(symmetricCyphertext, this.SecretBox.nonceBytes);

				try {
					callback(cyphertext);
				}
				finally {
					Potassium.clearMemory(paddedPlaintext);
					Potassium.clearMemory(nonce);
					Potassium.clearMemory(symmetricCyphertext);
				}
			};

			paddedPlaintext.set(new Uint8Array([paddingLength]));
			paddedPlaintext.set(Potassium.randomBytes(paddingLength), 1);
			paddedPlaintext.set(plaintext, 1 + paddingLength);

			if (this.isNative) {
				NativeCrypto.SecretBox.seal(paddedPlaintext, nonce, key, processData);
			}
			else {
				processData(Potassium.Sodium.crypto_secretbox_easy(
					paddedPlaintext,
					nonce,
					key
				));
			}
		},

		open: (
			cyphertext: Uint8Array,
			key: Uint8Array,
			callback: (plaintext: Uint8Array) => void
		) : void => {
			const nonce: Uint8Array					= new Uint8Array(
				cyphertext.buffer,
				0,
				this.SecretBox.nonceBytes
			);

			const symmetricCyphertext: Uint8Array	= new Uint8Array(
				cyphertext.buffer,
				this.SecretBox.nonceBytes
			);

			const unpadData	= (paddedPlaintext: Uint8Array) : void => {
				try {
					callback(new Uint8Array(new Uint8Array(
						paddedPlaintext.buffer,
						1 + new Uint8Array(paddedPlaintext.buffer, 0, 1)[0]
					)));
				}
				finally {
					Potassium.clearMemory(paddedPlaintext);
				}
			};

			if (this.isNative) {
				NativeCrypto.SecretBox.open(symmetricCyphertext, nonce, key, unpadData);
			}
			else {
				unpadData(Potassium.Sodium.crypto_secretbox_open_easy(
					symmetricCyphertext,
					nonce,
					key
				));
			}
		}
	};

	public Sign: {
		bytes: number;
		publicKeyBytes: number;
		privateKeyBytes: number;

		keyPair: (
			callback: (keyPair: {
				publicKey: Uint8Array;
				privateKey: Uint8Array;
			}) => void
		) => void;

		sign: (
			message: Uint8Array | string,
			privateKey: Uint8Array,
			callback: (signed: string, messageHash: string) => void
		) => void;

		signDetached: (
			message: Uint8Array | string,
			privateKey: Uint8Array,
			callback: (signature: string, messageHash: string) => void
		) => void;

		open: (
			signed: Uint8Array | string,
			publicKey: Uint8Array,
			callback: (message: string, messageHash: string) => void
		) => void;

		verifyDetached: (
			signature: Uint8Array | string,
			message: Uint8Array | string,
			publicKey: Uint8Array,
			callback: (isValid: boolean, messageHash: string) => void
		) => void;
	}	= {
		bytes: Potassium.SuperSphincs.signatureLength,
		publicKeyBytes: Potassium.SuperSphincs.publicKeyLength,
		privateKeyBytes: Potassium.SuperSphincs.privateKeyLength,
		keyPair: Potassium.SuperSphincs.keyPair,
		sign: Potassium.SuperSphincs.sign,
		signDetached: Potassium.SuperSphincs.signDetached,
		open: Potassium.SuperSphincs.open,
		verifyDetached: Potassium.SuperSphincs.verifyDetached
	};

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

			this.OneTimeAuth	= NativeCrypto.OneTimeAuth;

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

			this.SecretBox.keyBytes		= NativeCrypto.SecretBox.keyBytes;
			this.SecretBox.nonceBytes	= NativeCrypto.SecretBox.nonceBytes;
		}
	}
}
