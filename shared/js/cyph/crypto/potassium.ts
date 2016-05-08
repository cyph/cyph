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


	public box	= {
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
					publicKey: new Uint8Array(this.box.publicKeyBytes),
					privateKey: new Uint8Array(this.box.privateKeyBytes)
				};

				keyPair.publicKey.set(ntruKeyPair.publicKey);
				keyPair.privateKey.set(ntruKeyPair.privateKey);
				keyPair.publicKey.set(altKeyPair.publicKey, Potassium.Ntru.publicKeyLength);
				keyPair.privateKey.set(altKeyPair.privateKey, Potassium.Ntru.privateKeyLength);

				callback(keyPair);
			};

			if (this.isNative) {
				NativeCrypto.box.keyPair(generateKeyPair);
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

			const nonce: Uint8Array	= Potassium.Sodium.randombytes_buf(
				this.secretBox.nonceBytes
			);

			const encryptData	= (altCyphertext: Uint8Array) : void => {
				const symmetricKey: Uint8Array		= Potassium.Sodium.randombytes_buf(
					this.secretBox.keyBytes
				);

				const ntruAuthKey: Uint8Array		= Potassium.Sodium.randombytes_buf(
					this.oneTimeAuth.keyBytes
				);

				const ntruPlaintext: Uint8Array		= new Uint8Array(
					this.secretBox.keyBytes + this.oneTimeAuth.keyBytes
				);

				ntruPlaintext.set(symmetricKey);
				ntruPlaintext.set(ntruAuthKey, this.secretBox.keyBytes);

				const ntruCyphertext: Uint8Array	= Ntru.encrypt(
					ntruPlaintext,
					publicKeys.ntru
				);

				this.oneTimeAuth.sign(
					ntruCyphertext,
					ntruAuthKey,
					(ntruMac: Uint8Array) : void => this.secretBox.seal(
						altCyphertext,
						symmetricKey,
						(symmetricCyphertext: Uint8Array) : void => {
							const cyphertext: Uint8Array	= new Uint8Array(
								Potassium.Ntru.encryptedDataLength +
								this.oneTimeAuth.bytes +
								this.secretBox.nonceBytes +
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
									this.oneTimeAuth.bytes
							);
							cyphertext.set(
								symmetricCyphertext,
								Potassium.Ntru.encryptedDataLength +
									this.oneTimeAuth.bytes +
									this.secretBox.nonceBytes
							);

							callback(cyphertext);
						}
					)
				);
			};

			if (this.isNative) {
				NativeCrypto.box.seal(
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
				this.oneTimeAuth.bytes
			);

			const nonce: Uint8Array					= new Uint8Array(
				cyphertext.buffer,
				Potassium.Ntru.encryptedDataLength + this.oneTimeAuth.bytes,
				this.secretBox.nonceBytes
			);

			const symmetricCyphertext: Uint8Array	= new Uint8Array(
				cyphertext.buffer,
				Potassium.Ntru.encryptedDataLength +
					this.oneTimeAuth.bytes +
					this.secretBox.nonceBytes
			);


			const ntruPlaintext: Uint8Array	= Potassium.Ntru.decrypt(
				ntruCyphertext,
				privateKeys.ntru
			);

			const symmetricKey: Uint8Array	= new Uint8Array(
				ntruPlaintext.buffer,
				0,
				this.secretBox.keyBytes
			);

			const ntruAuthKey: Uint8Array	= new Uint8Array(
				ntruPlaintext.buffer,
				this.secretBox.keyBytes
			);

			this.oneTimeAuth.verify(
				ntruMac,
				ntruCyphertext,
				ntruAuthKey,
				(isValid: boolean) : void => {
					if (!isValid) {
						throw new Error('Invalid NTRU cyphertext.')
					}

					this.secretBox.open(
						symmetricCyphertext,
						symmetricKey,
						(altCyphertext: Uint8Array) : void => {
							if (this.isNative) {
								NativeCrypto.box.open(
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
					);
				}
			);
		}
	};

	public oneTimeAuth	= {
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

	public passwordHash	= {
		memLimit: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE,
		opsLimit: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE,
		saltBytes: <number> Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES,

		hash: (
			plaintext: Uint8Array,
			salt: Uint8Array = Potassium.Sodium.randombytes_buf(
				this.passwordHash.saltBytes
			),
			outputBytes: number = this.secretBox.keyBytes,
			opsLimit: number = this.passwordHash.opsLimit,
			memLimit: number = this.passwordHash.memLimit,
			callback: (hashData: {
				hash: Uint8Array;
				salt: Uint8Array;
				opsLimit: number;
				memLimit: number;
			}) => void
		) : void => {
			callback({
				hash: Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256(
					outputBytes,
					plaintext,
					salt,
					opsLimit,
					memLimit
				),
				salt,
				opsLimit,
				memLimit
			});
		}
	};

	public secretBox	= {
		keyBytes: <number> Potassium.Sodium.crypto_secretbox_KEYBYTES,
		nonceBytes: <number> Potassium.Sodium.crypto_secretbox_NONCEBYTES,

		seal: (
			plaintext: Uint8Array,
			key: Uint8Array,
			callback: (cyphertext: Uint8Array) => void
		) : void => {
			const nonce: Uint8Array	= Potassium.Sodium.randombytes_buf(
				this.secretBox.nonceBytes
			);

			const encryptData	= (symmetricCyphertext: Uint8Array) : void => {
				const cyphertext: Uint8Array	= new Uint8Array(
					this.secretBox.nonceBytes + symmetricCyphertext.length
				);

				cyphertext.set(nonce);
				cyphertext.set(symmetricCyphertext, this.secretBox.nonceBytes);

				callback(cyphertext);
			};

			if (this.isNative) {
				NativeCrypto.secretBox.seal(plaintext, nonce, key, encryptData);
			}
			else {
				encryptData(Potassium.Sodium.crypto_secretbox_easy(
					plaintext,
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
				this.secretBox.nonceBytes
			);

			const symmetricCyphertext: Uint8Array	= new Uint8Array(
				cyphertext.buffer,
				this.secretBox.nonceBytes
			);

			if (this.isNative) {
				NativeCrypto.secretBox.open(symmetricCyphertext, nonce, key, callback);
			}
			else {
				callback(Potassium.Sodium.crypto_secretbox_open_easy(
					symmetricCyphertext,
					nonce,
					key
				));
			}
		}
	};

	public sign: {
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

	public constructor (public isNative: boolean = false) {
		if (this.isNative) {
			this.oneTimeAuth	= NativeCrypto.oneTimeAuth;
			this.passwordHash	= NativeCrypto.passwordHash;

			this.secretBox.keyBytes		= NativeCrypto.secretBox.keyBytes;
			this.secretBox.nonceBytes	= NativeCrypto.secretBox.nonceBytes;

			this.box.publicKeyBytes		=
				Potassium.Ntru.publicKeyLength +
				NativeCrypto.box.publicKeyBytes
			;

			this.box.privateKeyBytes	=
				Potassium.Ntru.privateKeyLength +
				NativeCrypto.box.privateKeyBytes
			;
		}
	}
}
