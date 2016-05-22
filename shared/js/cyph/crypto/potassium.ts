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
			callback: (
				keyPair: {
					keyType: string;
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				},
				err: any
			) => void
		) : void => {
			const generateKeyPair	= (
				altKeyPair: {
					keyType: string;
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				},
				err: any
			) : void => {
				if (err) {
					callback(undefined, err);
					return;
				}

				let ntruKeyPair: {
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				};

				let keyPair: {
					keyType: string;
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				};

				try {
					ntruKeyPair	= Potassium.Ntru.keyPair();

					keyPair		= {
						keyType: 'potassium',
						publicKey: new Uint8Array(this.Box.publicKeyBytes),
						privateKey: new Uint8Array(this.Box.privateKeyBytes)
					};

					keyPair.publicKey.set(ntruKeyPair.publicKey);
					keyPair.privateKey.set(ntruKeyPair.privateKey);
					keyPair.publicKey.set(altKeyPair.publicKey, Potassium.Ntru.publicKeyLength);
					keyPair.privateKey.set(altKeyPair.privateKey, Potassium.Ntru.privateKeyLength);
				}
				catch (err) {
					callback(undefined, err);
					return;
				}
				finally {
					Potassium.clearMemory(ntruKeyPair.privateKey);
					Potassium.clearMemory(altKeyPair.privateKey);
					Potassium.clearMemory(ntruKeyPair.publicKey);
					Potassium.clearMemory(altKeyPair.publicKey);
				}

				callback(keyPair, undefined);
			};

			if (this.isNative) {
				NativeCrypto.Box.keyPair(generateKeyPair);
			}
			else {
				let altKeyPair: {
					keyType: string;
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				};
				try {
					altKeyPair	= Potassium.Sodium.crypto_box_keypair();
				}
				catch (err) {
					callback(undefined, err);
					return;
				}

				generateKeyPair(altKeyPair, undefined);
			}
		},

		seal: (
			plaintext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (cyphertext: Uint8Array, err: any) => void
		) : void => {
			try {
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

				const nonce: Uint8Array	= Potassium.randomBytes(
					this.Box.nonceBytes
				);

				const encryptData	= (altCyphertext: Uint8Array, err: any) : void => {
					if (err) {
						callback(undefined, err);
						return;
					}

					try {
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

						const ntruCyphertext: Uint8Array	= Potassium.Ntru.encrypt(
							ntruPlaintext,
							publicKeys.ntru
						);

						this.OneTimeAuth.sign(
							ntruCyphertext,
							ntruAuthKey,
							(ntruMac: Uint8Array, err: any) : void => {
								if (err) {
									callback(undefined, err);
									return;
								}

								this.SecretBox.seal(
									altCyphertext,
									symmetricKey,
									(symmetricCyphertext: Uint8Array, err: any) : void => {
										if (err) {
											callback(undefined, err);
											return;
										}

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
											callback(cyphertext, undefined);
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
								);
							}
						);
					}
					catch (err) {
						callback(undefined, err);
					}
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
					let altCyphertext: Uint8Array;
					try {
						altCyphertext	= Potassium.Sodium.crypto_box_easy(
							plaintext,
							nonce,
							publicKeys.alt,
							privateKeys.alt
						);
					}
					catch (err) {
						callback(undefined, err);
						return;
					}

					encryptData(altCyphertext, undefined);
				}
			}
			catch (err) {
				callback(undefined, err);
			}
			finally {
				Potassium.clearMemory(privateKey);
				Potassium.clearMemory(publicKey);
			}
		},

		open: (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array,
			callback: (plaintext: Uint8Array, err: any) => void
		) : void => {
			try {
				cyphertext	= new Uint8Array(cyphertext);
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
					(isValid: boolean, err: any) : void => {
						if (err) {
							callback(undefined, err);
							return;
						}
						if (!isValid) {
							callback(undefined, new Error('Invalid NTRU cyphertext.'));
							return;
						}

						this.SecretBox.open(
							symmetricCyphertext,
							symmetricKey,
							(altCyphertext: Uint8Array, err: any) : void => {
								if (err) {
									callback(undefined, err);
									return;
								}

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
										let plaintext: Uint8Array;
										try {
											plaintext	= Potassium.Sodium.crypto_box_open_easy(
												altCyphertext,
												nonce,
												publicKeys.alt,
												privateKeys.alt
											);
										}
										catch (err) {
											callback(undefined, err);
											return;
										}

										callback(plaintext, undefined);
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
			catch (err) {
				callback(undefined, err);
			}
			finally {
				Potassium.clearMemory(privateKey);
				Potassium.clearMemory(publicKey);
				Potassium.clearMemory(cyphertext);
			}
		}
	};

	public OneTimeAuth	= {
		bytes: <number> Potassium.Sodium.crypto_onetimeauth_BYTES,
		keyBytes: <number> Potassium.Sodium.crypto_onetimeauth_KEYBYTES,

		sign: (
			message: Uint8Array,
			key: Uint8Array,
			callback: (mac: Uint8Array, err: any) => void
		) : void => {
			let mac: Uint8Array;

			try {
				mac	= Potassium.Sodium.crypto_onetimeauth(
					message,
					key
				);
			}
			catch (err) {
				callback(undefined, err);
				return;
			}

			callback(mac, undefined);
		},

		verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array,
			callback: (isValid: boolean, err: any) => void
		) : void => {
			let isValid: boolean;

			try {
				isValid	= Potassium.Sodium.crypto_onetimeauth_verify(
					mac,
					message,
					key
				);
			}
			catch (err) {
				callback(undefined, err);
				return;
			}

			callback(isValid, undefined);
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
				memLimit: number,
				err: any
			) => void
		) : void => {
			completeHash	= new Uint8Array(completeHash);

			let outputBytes: number;
			let hash: Uint8Array;
			let salt: Uint8Array;
			let opsLimit: number;
			let memLimit: number;

			try {
				outputBytes	= new Uint32Array(completeHash.buffer, 0, 1)[0];
				hash		= new Uint8Array(new Uint8Array(completeHash.buffer, 12, outputBytes));
				salt		= new Uint8Array(new Uint8Array(completeHash.buffer, 12 + outputBytes));
				opsLimit	= new Uint32Array(completeHash.buffer, 1, 1)[0];
				memLimit	= new Uint32Array(completeHash.buffer, 2, 1)[0];
			}
			catch (err) {
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
			finally {
				Potassium.clearMemory(completeHash);
			}

			callback(
				hash,
				salt,
				outputBytes,
				opsLimit,
				memLimit,
				undefined
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
				memLimit: number,
				err: any
			) => void
		) : void => {
			const addMetadataToHash	= (hash: Uint8Array, err: any) : void => {
				if (err) {
					callback(
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						err
					);
					return;
				}

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
					memLimit,
					undefined
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
				let hash: Uint8Array;
				try {
					hash	= Potassium.Sodium.crypto_pwhash_scryptsalsa208sha256(
						outputBytes,
						plaintext,
						salt,
						opsLimit,
						memLimit
					);
				}
				catch (err) {
					callback(
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						err
					);
					return;
				}

				addMetadataToHash(hash, undefined);
			}
		}
	};

	public SecretBox	= {
		keyBytes: <number> Potassium.Sodium.crypto_secretbox_KEYBYTES,
		nonceBytes: <number> Potassium.Sodium.crypto_secretbox_NONCEBYTES,

		seal: (
			plaintext: Uint8Array,
			key: Uint8Array,
			callback: (cyphertext: Uint8Array, err: any) => void
		) : void => {
			const nonce: Uint8Array	= Potassium.randomBytes(
				this.SecretBox.nonceBytes
			);

			const paddingLength: number			= Potassium.randomBytes(1)[0];

			const paddedPlaintext: Uint8Array	= new Uint8Array(
				1 + paddingLength + plaintext.length
			);

			const processData	= (symmetricCyphertext: Uint8Array, err: any) : void => {
				if (err) {
					callback(undefined, err);
					return;
				}

				const cyphertext: Uint8Array	= new Uint8Array(
					this.SecretBox.nonceBytes + symmetricCyphertext.length
				);

				cyphertext.set(nonce);
				cyphertext.set(symmetricCyphertext, this.SecretBox.nonceBytes);

				try {
					callback(cyphertext, undefined);
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
				let symmetricCyphertext: Uint8Array;
				try {
					symmetricCyphertext	= Potassium.Sodium.crypto_secretbox_easy(
						paddedPlaintext,
						nonce,
						key
					);
				}
				catch (err) {
					callback(undefined, err);
					return;
				}

				processData(symmetricCyphertext, undefined);
			}
		},

		open: (
			cyphertext: Uint8Array,
			key: Uint8Array,
			callback: (plaintext: Uint8Array, err: any) => void
		) : void => {
			try {
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

				const unpadData	= (paddedPlaintext: Uint8Array, err: any) : void => {
					if (err) {
						callback(undefined, err);
						return;
					}

					try {
						callback(
							new Uint8Array(new Uint8Array(
								paddedPlaintext.buffer,
								1 + new Uint8Array(paddedPlaintext.buffer, 0, 1)[0]
							)),
							undefined
						);
					}
					finally {
						Potassium.clearMemory(paddedPlaintext);
					}
				};

				if (this.isNative) {
					NativeCrypto.SecretBox.open(symmetricCyphertext, nonce, key, unpadData);
				}
				else {
					let paddedPlaintext;
					try {
						paddedPlaintext	= Potassium.Sodium.crypto_secretbox_open_easy(
							symmetricCyphertext,
							nonce,
							key
						);
					}
					catch (err) {
						callback(undefined, err);
						return;
					}

					unpadData(paddedPlaintext, undefined);
				}
			}
			catch (err) {
				callback(undefined, err);
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

		keyPair: (
			callback: (
				keyPair: {
					publicKey: Uint8Array;
					privateKey: Uint8Array;
				},
				err: any
			) => void
		) => void;

		sign: (
			message: Uint8Array | string,
			privateKey: Uint8Array,
			callback: (signed: string, messageHash: string, err: any) => void
		) => void;

		signDetached: (
			message: Uint8Array | string,
			privateKey: Uint8Array,
			callback: (signature: string, messageHash: string, err: any) => void
		) => void;

		open: (
			signed: Uint8Array | string,
			publicKey: Uint8Array,
			callback: (message: string, messageHash: string, err: any) => void
		) => void;

		verifyDetached: (
			signature: Uint8Array | string,
			message: Uint8Array | string,
			publicKey: Uint8Array,
			callback: (isValid: boolean, messageHash: string, err: any) => void
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
