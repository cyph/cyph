/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../../base-provider';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {IKeyPair} from '../../proto/types';
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

					const readArmoredKeys = async (
						keys: string[] | undefined
					) =>
						keys === undefined ?
							undefined :
							(await Promise.all(
								keys.map(
									async k =>
										(await openpgp.key.readArmored(k)).keys
								)
							)).reduce((a, b) => a.concat(b), []);

					const transfer = async (data: any) => {
						data = await data;
						return data instanceof Uint8Array ?
							(<any> self).Comlink.transfer(data, [data.buffer]) :
							data;
					};

					(<any> self).Comlink.expose(
						{
							boxOpen: async (
								cyphertext: Uint8Array | string,
								privateKeysArmored: string[],
								signingPublicKeysArmored: string[] | undefined,
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
									readArmoredKeys(privateKeysArmored),
									readArmoredKeys(signingPublicKeysArmored)
								]);

								const o = await openpgp.decrypt({
									format: bytes ? 'binary' : undefined,
									message,
									privateKeys,
									publicKeys
								});

								return transfer(o.data);
							},
							boxSeal: async (
								plaintext: Uint8Array | string,
								publicKeysArmored: string[],
								signingPrivateKeysArmored: string[] | undefined,
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
									readArmoredKeys(signingPrivateKeysArmored),
									readArmoredKeys(publicKeysArmored)
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
							keyPair: async (
								name: string | undefined,
								email: string | undefined,
								comment: string | undefined
							) => {
								const {
									privateKeyArmored,
									publicKeyArmored
								} = await openpgp.generateKey({
									rsaBits: 4096,
									userIds: [{comment, email, name}]
								});

								return {privateKeyArmored, publicKeyArmored};
							},
							readArmored: async (publicKeyArmored: string) => {
								const o = await openpgp.key.readArmored(
									publicKeyArmored
								);

								const userID =
									(o.keys[0].users[0] || {}).userId || {};

								return {
									comment: userID.comment,
									email: userID.email,
									fingerprint: o.keys[0].getFingerprint(),
									keyID: o.keys[0].getKeyId().toHex(),
									name: userID.name,
									userID: userID.userid
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
								publicKeysArmored: string[]
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
										readArmoredKeys(publicKeysArmored)
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

								return transfer(
									detached ?
										(<{valid: boolean}[]> o.signatures)
											.map(sig => sig.valid)
											.reduce((a, b) => a && b, true) :
										o.data
								);
							},
							signSign: async (
								message: Uint8Array | string,
								privateKeysArmored: string[],
								detached: boolean,
								bytes: boolean
							) => {
								const armor = !bytes;

								const pgpMessage =
									typeof message === 'string' ?
										openpgp.cleartext.fromText(message) :
										openpgp.message.fromBinary(message);

								const privateKeys = await readArmoredKeys(
									privateKeysArmored
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
		async (publicKey?: Uint8Array | string) => {
			let comment: string | undefined;
			let email: string | undefined;
			let fingerprint: string | undefined;
			let keyID: string | undefined;
			let name: string | undefined;
			let userID: string | undefined;

			publicKey =
				publicKey === undefined ?
					undefined :
					potassiumUtil.toString(publicKey);

			try {
				if (publicKey) {
					publicKey = potassiumUtil.toString(publicKey);

					const o = await (await this.openpgp()).readArmored(
						publicKey
					);

					comment = o.comment;
					email = o.email;
					fingerprint = this.formatHex(o.fingerprint);
					keyID = this.formatHex(o.keyID);
					name = o.name;
					userID = o.userID;
				}
			}
			catch (err) {
				debugLogError(() => ({getPublicKeyMetadataError: err}));
			}

			return {
				comment,
				email,
				fingerprint,
				keyID,
				name,
				publicKey,
				userID
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
			(keyPair instanceof Array ? keyPair : [keyPair]).map(kp =>
				potassiumUtil.toString(kp.privateKey)
			),
			signingPublicKey === undefined ?
				undefined :
				(signingPublicKey instanceof Array ?
					signingPublicKey :
					[signingPublicKey]
				).map(pk => potassiumUtil.toString(pk)),
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
			(publicKey instanceof Array ? publicKey : [publicKey]).map(pk =>
				potassiumUtil.toString(pk)
			),
			signingPrivateKey === undefined ?
				undefined :
				(signingPrivateKey instanceof Array ?
					signingPrivateKey :
					[signingPrivateKey]
				).map(sk => potassiumUtil.toString(sk)),
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
			(publicKey instanceof Array ? publicKey : [publicKey]).map(pk =>
				potassiumUtil.toString(pk)
			)
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
			(privateKey instanceof Array ? privateKey : [privateKey]).map(sk =>
				potassiumUtil.toString(sk)
			),
			detached,
			bytes
		);

		return bytes ?
			potassiumUtil.fromString(data) :
			potassiumUtil.toString(data).trim();
	}

	/** Generates key pair. */
	public async keyPair (
		name?: string,
		email?: string,
		comment?: string
	) : Promise<IKeyPair> {
		const kp = await (await this.openpgp()).keyPair(name, email, comment);

		return {
			privateKey: potassiumUtil.fromString(kp.privateKeyArmored),
			publicKey: potassiumUtil.fromString(kp.publicKeyArmored)
		};
	}

	constructor (
		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();
	}
}
