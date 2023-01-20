/* eslint-disable max-classes-per-file, max-lines */

import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import OpenPGP from 'openpgp/openpgp.d';
import {BaseProvider} from '../../base-provider';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {IKeyPair, IPGPMetadata} from '../../proto/types';
import {debugLogError} from '../../util/log';
import {DialogService} from '../dialog.service';
import {StringsService} from '../strings.service';
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
				'PGPService',
				/* eslint-disable-next-line prefer-arrow/prefer-arrow-functions */
				function () : void {
					importScripts(
						'/assets/node_modules/openpgp/dist/openpgp.min.js'
					);

					const openpgp: typeof OpenPGP = (<any> self).openpgp;

					openpgp.config.versionString = 'Cyph';
					openpgp.config.commentString = 'https://www.cyph.com';
					openpgp.config.showVersion = true;
					openpgp.config.showComment = true;

					const readRawKey = async (key: Uint8Array | string) =>
						typeof key === 'string' ?
							openpgp.readKey({armoredKey: key}) :
							openpgp.readKey({binaryKey: key});

					/* eslint-disable-next-line @typescript-eslint/unbound-method */
					const {readRawKeys} = class {
						/** @ignore */
						public static async readRawKeys (
							keys: undefined
						) : Promise<undefined>;
						public static async readRawKeys (
							keys: (Uint8Array | string)[]
						) : Promise<OpenPGP.Key[]>;
						public static async readRawKeys (
							keys: (Uint8Array | string)[] | undefined
						) : Promise<OpenPGP.Key[] | undefined>;
						public static async readRawKeys (
							keys: (Uint8Array | string)[] | undefined
						) : Promise<OpenPGP.Key[] | undefined> {
							return keys === undefined ?
								undefined :
								Promise.all(keys.map(readRawKey));
						}
					};

					const transfer = async (data: any) => {
						data = await data;
						return data instanceof Uint8Array ?
							(<any> self).Comlink.transfer(data, [data.buffer]) :
							data;
					};

					const validateSignatures = async (
						/* eslint-disable-next-line no-null/no-null */
						signatures: {verified?: Promise<null | boolean>}[],
						publicKeys?: any[]
					) =>
						!!publicKeys &&
						(publicKeys.length < 1 ||
							(signatures.length >= publicKeys.length &&
								(
									await Promise.all(
										signatures.map(
											async sig =>
												(await sig.verified) === true
										)
									)
								).reduce((a, b) => a && b, true)));

					(<any> self).Comlink.expose(
						{
							boxOpen: async (
								cyphertext: Uint8Array | string,
								privateKeysRaw: (Uint8Array | string)[],
								signingPublicKeysRaw:
									| (Uint8Array | string)[]
									| undefined
							) => {
								const [message, privateKeys, publicKeys] =
									await Promise.all([
										(async () =>
											typeof cyphertext !== 'string' ?
												{
													bytes: await openpgp.readMessage(
														{
															binaryMessage:
																cyphertext
														}
													)
												} :
												{
													text: await openpgp.readMessage(
														{
															armoredMessage:
																cyphertext
														}
													)
												})(),
										readRawKeys(privateKeysRaw),
										readRawKeys(signingPublicKeysRaw)
									]);

								const decryptBaseOptions = {
									decryptionKeys: <OpenPGP.PrivateKey[]> (
										privateKeys
									),
									verificationKeys: <OpenPGP.PublicKey[]> (
										publicKeys
									)
								};

								const o =
									message.bytes !== undefined ?
										await openpgp.decrypt({
											...decryptBaseOptions,
											format: 'binary',
											message: message.bytes
										}) :
										await openpgp.decrypt({
											...decryptBaseOptions,
											message: message.text
										});

								if (
									!(await validateSignatures(
										o.signatures,
										publicKeys
									))
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
									| undefined
							) => {
								const [message, privateKeys, publicKeys] =
									await Promise.all([
										(async () =>
											typeof plaintext !== 'string' ?
												{
													bytes: await openpgp.createMessage(
														{
															binary: plaintext
														}
													)
												} :
												{
													text: await openpgp.createMessage(
														{
															text: plaintext
														}
													)
												})(),
										readRawKeys(signingPrivateKeysRaw),
										readRawKeys(publicKeysRaw)
									]);

								const encryptBaseOptions = {
									encryptionKeys: <OpenPGP.PublicKey[]> (
										publicKeys
									),
									signingKeys: <OpenPGP.PrivateKey[]> (
										privateKeys
									)
								};

								const cyphertext =
									message.bytes !== undefined ?
										await openpgp.encrypt({
											...encryptBaseOptions,
											format: 'binary',
											message: message.bytes
										}) :
										await openpgp.encrypt({
											...encryptBaseOptions,
											format: 'armored',
											message: message.text
										});

								return transfer(cyphertext);
							},
							getPrivateKeyArmor: async (
								privateKeyRaw: Uint8Array | string
							) => (await readRawKey(privateKeyRaw)).armor(),
							getPublicKeyMetadata: async (
								publicKeyRaw: Uint8Array | string
							) => {
								const publicKey = (
									await readRawKey(publicKeyRaw)
								).toPublic();

								const expirationTime =
									await publicKey.getExpirationTime();

								const {
									user: {userID}
								} = await publicKey.getPrimaryUser();

								return {
									comment: userID?.comment,
									email: userID?.email,
									expires:
										expirationTime === Infinity ?
											undefined :
										typeof expirationTime === 'number' ?
											expirationTime :
										expirationTime instanceof Date ?
											expirationTime.getTime() :
											undefined,
									fingerprint: publicKey.getFingerprint(),
									keyID: publicKey.getKeyID().toHex(),
									name: userID?.name,
									publicKey: publicKey.armor(),
									publicKeyBytes: await transfer(
										publicKey.write()
									),
									userID: userID?.userID
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
											passphrase?: string;
											privateKey: Uint8Array | string;
									  }
							) => {
								let o = !('privateKey' in options) ?
									(
										await openpgp.generateKey({
											format: 'object',
											rsaBits: 4096,
											userIDs: [options]
										})
									).privateKey :
									<OpenPGP.PrivateKey> (
										await readRawKey(options.privateKey)
									);

								if (
									'privateKey' in options &&
									!o.isDecrypted()
								) {
									try {
										o = await openpgp.decryptKey({
											passphrase: options.passphrase,
											privateKey: o
										});
									}
									catch {
										throw new Error(
											'Failed to decrypt private key.'
										);
									}
								}

								return {
									privateKey: await transfer(o.write()),
									publicKey: await transfer(
										o.toPublic().write()
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
								const [{message, signature}, publicKeys] =
									await Promise.all([
										!(
											typeof signed === 'string' ||
											signed instanceof Uint8Array
										) ?
											(async () => ({
												message:
													typeof signed ===
														'object' &&
													typeof signed.message ===
														'string' ?
														{
															bytes: undefined,
															cleartext:
																await openpgp.createCleartextMessage(
																	{
																		text: signed.message
																	}
																),
															text: undefined
														} :
													typeof signed ===
															'object' &&
														signed.message instanceof
															Uint8Array ?
														{
															bytes: await openpgp.createMessage(
																{
																	binary: signed.message
																}
															),
															cleartext:
																undefined,
															text: undefined
														} :
														undefined,
												signature:
													typeof signed ===
														'object' &&
													typeof signed.signature ===
														'string' ?
														await openpgp.readSignature(
															{
																armoredSignature:
																	signed.signature
															}
														) :
													typeof signed ===
															'object' &&
														signed.signature instanceof
															Uint8Array ?
														await openpgp.readSignature(
															{
																binarySignature:
																	signed.signature
															}
														) :
														undefined
											}))() :
										typeof signed === 'string' ?
											(async () => {
												if (
													typeof signed !== 'string'
												) {
													throw new Error(
														'Invalid `signed` value.'
													);
												}

												try {
													return {
														message: {
																bytes: undefined,
																cleartext:
																	await openpgp.readCleartextMessage(
																		{
																			cleartextMessage:
																				signed
																		}
																	),
																text: undefined
															},
														signature: undefined
													};
												}
												catch {
													return {
														message: {
																bytes: undefined,
																cleartext:
																	undefined,
																text: await openpgp.readMessage(
																	{
																		armoredMessage:
																			signed
																	}
																)
															},
														signature: undefined
													};
												}
											})() :
											(async () => ({
												message: {
														bytes: await openpgp.readMessage(
															{
																binaryMessage:
																	signed
															}
														),
														cleartext: undefined,
														text: undefined
													},
												signature: undefined
											}))(),
										readRawKeys(publicKeysRaw)
									]);

								if (message === undefined) {
									throw new Error('Invalid `message` value.');
								}

								const detached = signature !== undefined;

								const verifyBaseOptions = () => ({
									signature,
									verificationKeys: <OpenPGP.PublicKey[]> (
										publicKeys
									)
								});

								const o =
									message.cleartext !== undefined ?
										{
											data: message.cleartext.getText(),
											signatures:
												await message.cleartext.verify(
													publicKeys
												)
										} :
									message.bytes !== undefined ?
										await openpgp.verify({
											...verifyBaseOptions(),
											format: 'binary',
											message: message.bytes
										}) :
										await openpgp.verify({
											...verifyBaseOptions(),
											message: message.text
										});

								const isValid = await validateSignatures(
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
										await openpgp.createCleartextMessage({
											text: message
										}) :
										await openpgp.createMessage({
											binary: message
										});

								const privateKeys = await readRawKeys(
									privateKeysRaw
								);

								return transfer(
									pgpMessage instanceof
										openpgp.CleartextMessage ?
										await openpgp.sign({
											format: 'armored',
											detached,
											message: pgpMessage,
											signingKeys: <
													OpenPGP.PrivateKey[]
												> privateKeys
										}) :
									armor ?
										await openpgp.sign({
											format: 'armored',
											detached,
											message: pgpMessage,
											signingKeys: <
													OpenPGP.PrivateKey[]
												> privateKeys
										}) :
										await openpgp.sign({
											format: 'binary',
											detached,
											message: pgpMessage,
											signingKeys: <
													OpenPGP.PrivateKey[]
												> privateKeys
										})
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
	public readonly getPrivateKeyArmor = memoize(
		async (
			privateKey?: Uint8Array | string
		) : Promise<string | undefined> => {
			if (privateKey !== undefined) {
				try {
					return await (
						await this.openpgp()
					).getPrivateKeyArmor(privateKey);
				}
				catch (err) {
					debugLogError(() => ({getPrivateKeyArmorError: err}));
				}
			}

			return;
		}
	);

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
					const o = await (
						await this.openpgp()
					).getPublicKeyMetadata(publicKey);

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
		const data = await (
			await this.openpgp()
		).boxOpen(
			cyphertext,
			(keyPair instanceof Array ? keyPair : [keyPair]).map(
				kp => kp.privateKey
			),
			signingPublicKey === undefined ?
				undefined :
			signingPublicKey instanceof Array ?
				signingPublicKey :
				[signingPublicKey]
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
		const data = await (
			await this.openpgp()
		).boxSeal(
			plaintext,
			publicKey instanceof Array ? publicKey : [publicKey],
			signingPrivateKey === undefined ?
				undefined :
			signingPrivateKey instanceof Array ?
				signingPrivateKey :
				[signingPrivateKey]
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
		const data = await (
			await this.openpgp()
		).signOpen(
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
		const data = await (
			await this.openpgp()
		).signSign(
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
					passphrase?: string;
					privateKey: string;
			  } = {},
		promptForPassphraseIfNeeded: boolean = false
	) : Promise<IKeyPair> {
		const getKeyPair = async () => {
			const kp = await (await this.openpgp()).keyPair(options);

			return {
				privateKey: potassiumUtil.fromString(kp.privateKey),
				publicKey: potassiumUtil.fromString(kp.publicKey)
			};
		};

		if (!promptForPassphraseIfNeeded || !('privateKey' in options)) {
			return getKeyPair();
		}

		while (true) {
			try {
				return await getKeyPair();
			}
			catch (err) {
				if (
					!(err instanceof Error) ||
					err.message !== 'Failed to decrypt private key.'
				) {
					throw err;
				}

				options.passphrase = await this.dialogService.prompt({
					content: this.stringsService.pgpPassphraseContent,
					password: true,
					placeholder: this.stringsService.pgpPassphrasePlaceholder,
					title: this.stringsService.pgpPassphraseTitle
				});

				if (options.passphrase === undefined) {
					throw err;
				}
			}
		}
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly stringsService: StringsService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();
	}
}
