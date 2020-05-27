/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../../base-provider';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {IKeyPair, IPGPMetadata} from '../../proto/types';
import {debugLogError} from '../../util/log';
import {WorkerService} from '../worker.service';

/**
 * Angular service for PGP.
 */
@Injectable()
export class PGPService extends BaseProvider {
	/** Proxy for OpenPGP library inside a worker. */
	private readonly openpgp = memoize(async () =>
		this.workerService
			.createThread<any>(
				/* eslint-disable-next-line prefer-arrow/prefer-arrow-functions */
				function () : void {
					importScripts(
						'/assets/node_modules/openpgp/dist/openpgp.min.js'
					);

					const openpgp = (<any> self).openpgp;

					openpgp.config.versionstring = 'Cyph';
					openpgp.config.commentstring = 'https://www.cyph.com';

					const readRawKey = async (key: Uint8Array | string) =>
						typeof key === 'string' ?
							openpgp.key.readArmored(key) :
							openpgp.key.read(key);

					const readRawKeys = async (
						keys: (Uint8Array | string)[] | undefined
					) =>
						keys === undefined ?
							undefined :
							(await Promise.all(
								keys.map(async k => (await readRawKey(k)).keys)
							)).reduce((a, b) => a.concat(b), []);

					const transfer = async (data: any) => {
						data = await data;
						return data instanceof Uint8Array ?
							(<any> self).Comlink.transfer(data, [data.buffer]) :
							data;
					};

					const validateSignatures = (
						signatures: {valid?: boolean}[],
						publicKeys: any[]
					) =>
						publicKeys.length < 1 ||
						(signatures.length >= publicKeys.length &&
							signatures
								.map(sig => !!sig.valid)
								.reduce((a, b) => a && b, true));

					(<any> self).Comlink.expose(
						{
							boxOpen: async (
								cyphertext: Uint8Array | string,
								privateKeysRaw: (Uint8Array | string)[],
								signingPublicKeysRaw:
									| (Uint8Array | string)[]
									| undefined,
								bytes: boolean
							) => {
								const [
									message,
									privateKeys,
									publicKeys
								] = await Promise.all([
									typeof cyphertext === 'string' ?
										openpgp.message.readArmored(
											cyphertext
										) :
										openpgp.message.read(cyphertext),
									readRawKeys(privateKeysRaw),
									readRawKeys(signingPublicKeysRaw)
								]);

								const o = await openpgp.decrypt({
									format: bytes ? 'binary' : undefined,
									message,
									privateKeys,
									publicKeys
								});

								if (
									!validateSignatures(
										o.signatures,
										publicKeys
									)
								) {
									throw new Error('Invalid signature.');
								}

								return transfer(o.data);
							},
							boxSeal: async (
								plaintext: Uint8Array | string,
								publicKeysRaw: (Uint8Array | string)[],
								signingPrivateKeysRaw:
									| (Uint8Array | string)[]
									| undefined,
								bytes: boolean
							) => {
								const armor = !bytes;

								const message =
									typeof plaintext === 'string' ?
										openpgp.message.fromText(plaintext) :
										openpgp.message.fromBinary(plaintext);

								const [
									privateKeys,
									publicKeys
								] = await Promise.all([
									readRawKeys(signingPrivateKeysRaw),
									readRawKeys(publicKeysRaw)
								]);

								const o = await openpgp.encrypt({
									armor,
									message,
									privateKeys,
									publicKeys
								});

								return transfer(
									armor ? o.data : o.message.packets.write()
								);
							},
							getPublicKeyMetadata: async (
								publicKeyRaw: Uint8Array | string
							) => {
								const o = await readRawKey(publicKeyRaw);
								const publicKey = o.keys[0].toPublic();

								const expirationTime = await publicKey.getExpirationTime();

								const userID =
									(publicKey.users[0] || {}).userId || {};

								return {
									comment: userID.comment,
									email: userID.email,
									expires:
										expirationTime === Infinity ?
											undefined :
											expirationTime.getTime(),
									fingerprint: publicKey.getFingerprint(),
									keyID: publicKey.getKeyId().toHex(),
									publicKey: publicKey.armor(),
									publicKeyBytes: await transfer(
										publicKey.toPacketlist().write()
									),
									name: userID.name,
									userID: userID.userid
								};
							},
							keyPair: async (
								options:
									| {
											comment?: string;
											email?: string;
											name?: string;
									  }
									| {
											privateKey: Uint8Array | string;
									  }
							) => {
								const o = !('privateKey' in options) ?
									(await openpgp.generateKey({
										rsaBits: 4096,
										userIds: [options]
									})).key :
									(await readRawKey(options.privateKey))
										.keys[0];

								return {
									privateKey: await transfer(
										o.toPacketlist().write()
									),
									publicKey: await transfer(
										o
											.toPublic()
											.toPacketlist()
											.write()
									)
								};
							},
							signOpen: async (
								signed:
									| Uint8Array
									| string
									| {
											message: Uint8Array | string;
											signature: Uint8Array | string;
									  },
								publicKeysRaw: (Uint8Array | string)[]
							) => {
								const detached = !(
									typeof signed === 'string' ||
									signed instanceof Uint8Array
								);

								const [message, publicKeys] = await Promise.all(
									[
										!(
											typeof signed === 'string' ||
											signed instanceof Uint8Array
										) ?
											(async () => ({
												message:
													typeof signed.message ===
													'string' ?
														openpgp.cleartext.fromText(
															signed.message
														) :
														openpgp.message.fromBinary(
															signed.message
														),
												signature: await (typeof signed.signature ===
												'string' ?
													openpgp.signature.readArmored(
														signed.signature
													) :
													openpgp.signature.read(
														signed.signature
													))
											}))() :
										typeof signed === 'string' ?
											(async () => {
												try {
													return await openpgp.cleartext.readArmored(
														signed
													);
												}
												catch {
													return openpgp.message.readArmored(
														signed
													);
												}
											})() :
											openpgp.message.read(signed),
										readRawKeys(publicKeysRaw)
									]
								);

								const o = await openpgp.verify({
									detached,
									message: detached ?
										message.message :
										message,
									publicKeys,
									signature: detached ?
										message.signature :
										undefined
								});

								const isValid = validateSignatures(
									o.signatures,
									publicKeys
								);

								if (!isValid && !detached) {
									throw new Error('Invalid signature.');
								}

								return transfer(detached ? isValid : o.data);
							},
							signSign: async (
								message: Uint8Array | string,
								privateKeysRaw: (Uint8Array | string)[],
								detached: boolean,
								bytes: boolean
							) => {
								const armor = !bytes;

								const pgpMessage =
									typeof message === 'string' ?
										openpgp.cleartext.fromText(message) :
										openpgp.message.fromBinary(message);

								const privateKeys = await readRawKeys(
									privateKeysRaw
								);

								const o = await openpgp.sign({
									armor,
									detached,
									message: pgpMessage,
									privateKeys
								});

								return transfer(
									armor ?
										detached ?
											o.signature :
											o.data :
										(detached ?
											o.signature :
											o.message
										).packets.write()
								);
							}
						},
						self
					);
				}
			)
			.then(async thread => thread.api)
	);

	/** Potassium.Box-like interface. */
	public readonly box = {
		open: async (
			cyphertext: Uint8Array | string,
			keyPair: IKeyPair | IKeyPair[],
			signingPublicKey?: Uint8Array | string | (Uint8Array | string)[]
		) : Promise<string> =>
			this.boxOpen(cyphertext, keyPair, signingPublicKey, false),
		openBytes: async (
			cyphertext: Uint8Array | string,
			keyPair: IKeyPair | IKeyPair[],
			signingPublicKey?: Uint8Array | string | (Uint8Array | string)[]
		) : Promise<Uint8Array> =>
			this.boxOpen(cyphertext, keyPair, signingPublicKey, true),
		seal: async (
			plaintext: Uint8Array | string,
			publicKey: Uint8Array | string | (Uint8Array | string)[],
			signingPrivateKey?: Uint8Array | Uint8Array[]
		) : Promise<string> =>
			this.boxSeal(plaintext, publicKey, signingPrivateKey, false),
		sealBytes: async (
			plaintext: Uint8Array | string,
			publicKey: Uint8Array | string | (Uint8Array | string)[],
			signingPrivateKey?: Uint8Array | Uint8Array[]
		) : Promise<Uint8Array> =>
			this.boxSeal(plaintext, publicKey, signingPrivateKey, true)
	};

	/** Gets relevant metadata from PGP public key. */
	public readonly getPublicKeyMetadata = memoize(
		async (
			publicKey?: Uint8Array | string
		) : Promise<{
			pgpMetadata: IPGPMetadata;
			publicKey: string | undefined;
			publicKeyBytes: Uint8Array | undefined;
		}> => {
			let comment: string | undefined;
			let email: string | undefined;
			let expires: number | undefined;
			let fingerprint: string | undefined;
			let keyID: string | undefined;
			let name: string | undefined;
			let publicKeyArmor: string | undefined;
			let publicKeyBytes: Uint8Array | undefined;
			let userID: string | undefined;

			if (publicKey && publicKey.length < 1) {
				publicKey = undefined;
			}

			try {
				if (publicKey) {
					const o = await (await this.openpgp()).getPublicKeyMetadata(
						publicKey
					);

					/* TODO: Expose and warn about this in the UI instead */
					if (
						typeof o.expires === 'number' &&
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						Date.now() > o.expires
					) {
						throw new Error('Expired PGP key.');
					}

					comment = o.comment;
					email = o.email;
					expires = o.expires;
					fingerprint = this.formatHex(o.fingerprint);
					keyID = this.formatHex(o.keyID);
					publicKeyArmor = o.publicKey;
					publicKeyBytes = o.publicKeyBytes;
					name = o.name;
					userID = o.userID;
				}
			}
			catch (err) {
				debugLogError(() => ({getPublicKeyMetadataError: err}));
			}

			return {
				pgpMetadata: {
					comment,
					email,
					expires,
					fingerprint,
					keyID,
					name,
					userID
				},
				publicKey: publicKeyArmor,
				publicKeyBytes
			};
		}
	);

	/** Potassium.Sign-like interface. */
	public readonly sign = {
		open: async (
			signed: Uint8Array | string,
			publicKey: Uint8Array | string | (Uint8Array | string)[]
		) : Promise<string> => this.signOpen(signed, publicKey, false),
		openBytes: async (
			signed: Uint8Array | string,
			publicKey: Uint8Array | string | (Uint8Array | string)[]
		) : Promise<Uint8Array> => this.signOpen(signed, publicKey, true),
		sign: async (
			message: Uint8Array | string,
			privateKey: Uint8Array | Uint8Array[]
		) : Promise<string> => this.signSign(message, privateKey, false, false),
		signBytes: async (
			message: Uint8Array | string,
			privateKey: Uint8Array | Uint8Array[]
		) : Promise<Uint8Array> =>
			this.signSign(message, privateKey, false, true),
		signDetached: async (
			message: Uint8Array | string,
			privateKey: Uint8Array | Uint8Array[]
		) : Promise<string> => this.signSign(message, privateKey, true, false),
		signDetachedBytes: async (
			message: Uint8Array | string,
			privateKey: Uint8Array | Uint8Array[]
		) : Promise<Uint8Array> =>
			this.signSign(message, privateKey, true, true),
		verifyDetached: async (
			signature: Uint8Array | string,
			message: Uint8Array | string,
			publicKey: Uint8Array | string | (Uint8Array | string)[]
		) : Promise<boolean> => this.signOpen({message, signature}, publicKey)
	};

	/** @ignore */
	private async boxOpen (
		cyphertext: Uint8Array | string,
		keyPair: IKeyPair | IKeyPair[],
		signingPublicKey:
			| Uint8Array
			| string
			| (Uint8Array | string)[]
			| undefined,
		bytes: true
	) : Promise<Uint8Array>;
	private async boxOpen (
		cyphertext: Uint8Array | string,
		keyPair: IKeyPair | IKeyPair[],
		signingPublicKey:
			| Uint8Array
			| string
			| (Uint8Array | string)[]
			| undefined,
		bytes: false
	) : Promise<string>;
	private async boxOpen (
		cyphertext: Uint8Array | string,
		keyPair: IKeyPair | IKeyPair[],
		signingPublicKey:
			| Uint8Array
			| string
			| (Uint8Array | string)[]
			| undefined,
		bytes: boolean
	) : Promise<Uint8Array | string> {
		const data = await (await this.openpgp()).boxOpen(
			cyphertext,
			(keyPair instanceof Array ? keyPair : [keyPair]).map(
				kp => kp.privateKey
			),
			signingPublicKey === undefined ?
				undefined :
			signingPublicKey instanceof Array ?
				signingPublicKey :
				[signingPublicKey],
			bytes
		);

		return bytes ?
			potassiumUtil.fromString(data) :
			potassiumUtil.toString(data).trim();
	}

	/** @ignore */
	private async boxSeal (
		plaintext: Uint8Array | string,
		publicKey: Uint8Array | string | (Uint8Array | string)[],
		signingPrivateKey: Uint8Array | Uint8Array[] | undefined,
		bytes: true
	) : Promise<Uint8Array>;
	private async boxSeal (
		plaintext: Uint8Array | string,
		publicKey: Uint8Array | string | (Uint8Array | string)[],
		signingPrivateKey: Uint8Array | Uint8Array[] | undefined,
		bytes: false
	) : Promise<string>;
	private async boxSeal (
		plaintext: Uint8Array | string,
		publicKey: Uint8Array | string | (Uint8Array | string)[],
		signingPrivateKey: Uint8Array | Uint8Array[] | undefined,
		bytes: boolean
	) : Promise<Uint8Array | string> {
		const data = await (await this.openpgp()).boxSeal(
			plaintext,
			publicKey instanceof Array ? publicKey : [publicKey],
			signingPrivateKey === undefined ?
				undefined :
			signingPrivateKey instanceof Array ?
				signingPrivateKey :
				[signingPrivateKey],
			bytes
		);

		return bytes ?
			potassiumUtil.fromString(data) :
			potassiumUtil.toString(data).trim();
	}

	/** @ignore */
	private formatHex (hex: string | ArrayBufferView) : string {
		return (
			potassiumUtil
				.toHex(hex)
				.toUpperCase()
				.match(/(.{4}|.+$)/g) || []
		).join(' ');
	}

	/** @ignore */
	private async signOpen (
		signed: Uint8Array | string,
		publicKey: Uint8Array | string | (Uint8Array | string)[],
		bytes: true
	) : Promise<Uint8Array>;
	private async signOpen (
		signed: Uint8Array | string,
		publicKey: Uint8Array | string | (Uint8Array | string)[],
		bytes: false
	) : Promise<string>;
	private async signOpen (
		signed: {
			message: Uint8Array | string;
			signature: Uint8Array | string;
		},
		publicKey: Uint8Array | string | (Uint8Array | string)[]
	) : Promise<boolean>;
	private async signOpen (
		signed:
			| Uint8Array
			| string
			| {
					message: Uint8Array | string;
					signature: Uint8Array | string;
			  },
		publicKey: Uint8Array | string | (Uint8Array | string)[],
		bytes?: boolean
	) : Promise<Uint8Array | string | boolean> {
		const data = await (await this.openpgp()).signOpen(
			signed,
			publicKey instanceof Array ? publicKey : [publicKey]
		);

		return !(typeof signed === 'string' || signed instanceof Uint8Array) ?
			data === true :
		bytes ?
			potassiumUtil.fromString(data) :
			potassiumUtil.toString(data).trim();
	}

	/** @ignore */
	private async signSign (
		message: Uint8Array | string,
		privateKey: Uint8Array | Uint8Array[],
		detached: boolean,
		bytes: true
	) : Promise<Uint8Array>;
	private async signSign (
		message: Uint8Array | string,
		privateKey: Uint8Array | Uint8Array[],
		detached: boolean,
		bytes: false
	) : Promise<string>;
	private async signSign (
		message: Uint8Array | string,
		privateKey: Uint8Array | Uint8Array[],
		detached: boolean,
		bytes: boolean
	) : Promise<Uint8Array | string> {
		const data = await (await this.openpgp()).signSign(
			message,
			privateKey instanceof Array ? privateKey : [privateKey],
			detached,
			bytes
		);

		return bytes ?
			potassiumUtil.fromString(data) :
			potassiumUtil.toString(data).trim();
	}

	/** Generates key pair. */
	public async keyPair (
		options:
			| {
					comment?: string;
					email?: string;
					name?: string;
			  }
			| {
					privateKey: string;
			  } = {}
	) : Promise<IKeyPair> {
		const kp = await (await this.openpgp()).keyPair(options);

		return {
			privateKey: potassiumUtil.fromString(kp.privateKey),
			publicKey: potassiumUtil.fromString(kp.publicKey)
		};
	}

	constructor (
		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();
	}
}
