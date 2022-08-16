/* eslint-disable max-lines */

import * as lz4 from 'lz4';
import memoize from 'lodash-es/memoize';
import {superDilithium} from 'superdilithium';
import {superDilithium as superDilithiumRSA} from 'superdilithium/dist/rsa-variant.js';
import {superSphincs as superSphincsLegacy} from 'supersphincs-legacy';
import {superSphincs} from 'supersphincs';
import {superSphincs as superSphincsRSA} from 'supersphincs/dist/rsa-variant.js';
import {
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../../proto';
import {retryUntilSuccessful} from '../../util/wait/retry-until-successful';
import {ISign} from './isign';
import {potassiumEncoding} from './potassium-encoding';
import {potassiumUtil} from './potassium-util';

/** @inheritDoc */
export class Sign implements ISign {
	/** @ignore */
	private readonly algorithmPriorityOrderInternal = [
		PotassiumData.SignAlgorithms.V2,
		PotassiumData.SignAlgorithms.V2Hardened,
		PotassiumData.SignAlgorithms.NativeV2,
		PotassiumData.SignAlgorithms.NativeV2Hardened,
		PotassiumData.SignAlgorithms.V1,
		PotassiumData.SignAlgorithms.NativeV1
	];

	/** @ignore */
	private readonly currentAlgorithmInternal = !this.isNative ?
		PotassiumData.SignAlgorithms.V2 :
		PotassiumData.SignAlgorithms.NativeV2;

	/** @ignore */
	private readonly defaultMetadataInternal: IPotassiumData & {
		signAlgorithm: PotassiumData.SignAlgorithms;
	} = {
		signAlgorithm: PotassiumData.SignAlgorithms.V1
	};

	/** @inheritDoc */
	public readonly algorithmPriorityOrder = Promise.resolve(
		this.algorithmPriorityOrderInternal
	);

	/** @inheritDoc */
	public readonly currentAlgorithm = Promise.resolve(
		this.currentAlgorithmInternal
	);

	/** @inheritDoc */
	public readonly defaultMetadata = Promise.resolve(
		this.defaultMetadataInternal
	);

	/** @inheritDoc */
	public readonly getPrivateKeyBytes = memoize(
		async (
			algorithm: PotassiumData.SignAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			switch (algorithm) {
				case PotassiumData.SignAlgorithms.NativeV1:
				case PotassiumData.SignAlgorithms.V1:
					return superSphincsLegacy.privateKeyBytes;

				case PotassiumData.SignAlgorithms.NativeV2:
					return superDilithiumRSA.privateKeyBytes;

				case PotassiumData.SignAlgorithms.V2:
					return superDilithium.privateKeyBytes;

				case PotassiumData.SignAlgorithms.NativeV2Hardened:
					return superSphincsRSA.privateKeyBytes;

				case PotassiumData.SignAlgorithms.V2Hardened:
					return superSphincs.privateKeyBytes;

				default:
					throw new Error(
						'Invalid Sign algorithm (private key bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public readonly getBytes = memoize(
		async (
			algorithm: PotassiumData.SignAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			switch (algorithm) {
				case PotassiumData.SignAlgorithms.NativeV1:
				case PotassiumData.SignAlgorithms.V1:
					return superSphincsLegacy.bytes;

				case PotassiumData.SignAlgorithms.NativeV2:
					return superDilithiumRSA.bytes;

				case PotassiumData.SignAlgorithms.V2:
					return superDilithium.bytes;

				case PotassiumData.SignAlgorithms.NativeV2Hardened:
					return superSphincsRSA.bytes;

				case PotassiumData.SignAlgorithms.V2Hardened:
					return superSphincs.bytes;

				default:
					throw new Error('Invalid Sign algorithm (bytes).');
			}
		}
	);

	/** @inheritDoc */
	public readonly getPublicKeyBytes = memoize(
		async (
			algorithm: PotassiumData.SignAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			switch (algorithm) {
				case PotassiumData.SignAlgorithms.NativeV1:
				case PotassiumData.SignAlgorithms.V1:
					return superSphincsLegacy.publicKeyBytes;

				case PotassiumData.SignAlgorithms.NativeV2:
					return superDilithiumRSA.publicKeyBytes;

				case PotassiumData.SignAlgorithms.V2:
					return superDilithium.publicKeyBytes;

				case PotassiumData.SignAlgorithms.NativeV2Hardened:
					return superSphincsRSA.publicKeyBytes;

				case PotassiumData.SignAlgorithms.V2Hardened:
					return superSphincs.publicKeyBytes;

				default:
					throw new Error(
						'Invalid Sign algorithm (public key bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public async importPublicKeys (
		algorithm: PotassiumData.SignAlgorithms,
		classical: string,
		postQuantum: string
	) : Promise<Uint8Array> {
		let result: Uint8Array;

		switch (algorithm) {
			case PotassiumData.SignAlgorithms.NativeV1:
			case PotassiumData.SignAlgorithms.V1:
				result = (
					await superSphincsLegacy.importKeys({
						public: {classical, postQuantum}
					})
				).publicKey;
				break;

			case PotassiumData.SignAlgorithms.NativeV2:
				result = (
					await superDilithiumRSA.importKeys({
						public: {classical, postQuantum}
					})
				).publicKey;
				break;

			case PotassiumData.SignAlgorithms.V2:
				result = (
					await superDilithium.importKeys({
						public: {classical, postQuantum}
					})
				).publicKey;
				break;

			case PotassiumData.SignAlgorithms.NativeV2Hardened:
				result = (
					await superSphincsRSA.importKeys({
						public: {classical, postQuantum}
					})
				).publicKey;
				break;

			case PotassiumData.SignAlgorithms.V2Hardened:
				result = (
					await superSphincs.importKeys({
						public: {classical, postQuantum}
					})
				).publicKey;
				break;

			default:
				throw new Error('Invalid Sign algorithm (import public keys).');
		}

		return potassiumEncoding.serialize({
			publicKey: result,
			signAlgorithm: algorithm
		});
	}

	/** @inheritDoc */
	public async keyPair (
		algorithm: PotassiumData.SignAlgorithms = this.currentAlgorithmInternal
	) : Promise<IKeyPair> {
		return retryUntilSuccessful(async () => {
			let result: IKeyPair;

			switch (algorithm) {
				case PotassiumData.SignAlgorithms.NativeV1:
				case PotassiumData.SignAlgorithms.V1:
					result = await superSphincsLegacy.keyPair();
					break;

				case PotassiumData.SignAlgorithms.NativeV2:
					result = await superDilithiumRSA.keyPair();
					break;

				case PotassiumData.SignAlgorithms.V2:
					result = await superDilithium.keyPair();
					break;

				case PotassiumData.SignAlgorithms.NativeV2Hardened:
					result = await superSphincsRSA.keyPair();
					break;

				case PotassiumData.SignAlgorithms.V2Hardened:
					result = await superSphincs.keyPair();
					break;

				default:
					throw new Error('Invalid Sign algorithm (key pair).');
			}

			const keyPair = {
				privateKey: await potassiumEncoding.serialize({
					privateKey: result.privateKey,
					signAlgorithm: algorithm
				}),
				publicKey: await potassiumEncoding.serialize({
					publicKey: result.publicKey,
					signAlgorithm: algorithm
				})
			};

			const testInput = potassiumUtil.randomBytes(32);
			if (
				!potassiumUtil.compareMemory(
					testInput,
					await this.open(
						await this.sign(testInput, keyPair.privateKey),
						keyPair.publicKey
					)
				)
			) {
				throw new Error('Corrupt Potassium.Sign key.');
			}

			return keyPair;
		});
	}

	/** @inheritDoc */
	public async open (
		signed: Uint8Array | string,
		publicKey: Uint8Array | IPublicKeyring,
		additionalData: Uint8Array | string = new Uint8Array(0),
		decompressByDefault: boolean = false
	) : Promise<Uint8Array> {
		const potassiumSigned = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{
				signed: {
					compressed: decompressByDefault,
					defaultSignatureBytes: await this.getBytes(
						this.defaultMetadataInternal.signAlgorithm
					),
					message: new Uint8Array(0),
					signature: potassiumUtil.fromBase64(signed)
				}
			}
		);

		const algorithm = potassiumSigned.signAlgorithm;

		publicKey = await potassiumEncoding.openKeyring(
			PotassiumData.SignAlgorithms,
			publicKey,
			algorithm
		);

		const potassiumPublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{publicKey}
		);

		if (potassiumPublicKey.signAlgorithm !== algorithm) {
			throw new Error(
				'Signature - public key Sign algorithm mismatch (open).'
			);
		}

		const message = potassiumSigned.signed.compressed ?
			lz4.decode(potassiumSigned.signed.message) :
			potassiumSigned.signed.message;

		if (
			!(await this.verifyDetached(
				potassiumSigned.signed.signature,
				message,
				potassiumPublicKey.publicKey,
				additionalData,
				algorithm
			))
		) {
			throw new Error('Invalid signature.');
		}

		return message;
	}

	/** @inheritDoc */
	public async openRaw (
		signed: Uint8Array | string,
		publicKey: Uint8Array | IPublicKeyring,
		additionalData: Uint8Array | string = new Uint8Array(0),
		algorithm: PotassiumData.SignAlgorithms
	) : Promise<Uint8Array> {
		publicKey = await potassiumEncoding.openKeyring(
			PotassiumData.SignAlgorithms,
			publicKey,
			algorithm
		);

		const potassiumPublicKey = await potassiumEncoding.deserialize(
			{signAlgorithm: algorithm},
			{publicKey}
		);

		switch (algorithm) {
			case PotassiumData.SignAlgorithms.NativeV1:
			case PotassiumData.SignAlgorithms.V1:
				return superSphincsLegacy.open(
					signed,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.NativeV2:
				return superDilithiumRSA.open(
					signed,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.V2:
				return superDilithium.open(
					signed,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.NativeV2Hardened:
				return superSphincsRSA.open(
					signed,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.V2Hardened:
				return superSphincs.open(
					signed,
					potassiumPublicKey.publicKey,
					additionalData
				);

			default:
				throw new Error('Invalid Sign algorithm (openRaw).');
		}
	}

	/** @inheritDoc */
	public async sign (
		message: Uint8Array | string,
		privateKey: Uint8Array | IPrivateKeyring,
		additionalData: Uint8Array | string = new Uint8Array(0),
		compress: boolean = false
	) : Promise<Uint8Array> {
		message = potassiumUtil.fromString(message);

		privateKey = (
			await potassiumEncoding.openKeyring(
				PotassiumData.SignAlgorithms,
				privateKey instanceof Uint8Array ? {privateKey} : privateKey,
				this.algorithmPriorityOrderInternal
			)
		).privateKey;

		const potassiumPrivateKey = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{privateKey}
		);

		const algorithm = potassiumPrivateKey.signAlgorithm;

		let result: Uint8Array;

		switch (algorithm) {
			case PotassiumData.SignAlgorithms.NativeV1:
			case PotassiumData.SignAlgorithms.V1:
				result = await superSphincsLegacy.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.NativeV2:
				result = await superDilithiumRSA.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.V2:
				result = await superDilithium.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.NativeV2Hardened:
				result = await superSphincsRSA.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.V2Hardened:
				result = await superSphincs.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			default:
				throw new Error('Invalid Sign algorithm (sign).');
		}

		return potassiumEncoding.serialize(
			{
				signAlgorithm: algorithm,
				signed: {
					compressed: compress,
					message: compress ?
						lz4.encode(message, {streamChecksum: false}) :
						message,
					signature: result
				}
			},
			[message]
		);
	}

	/** @inheritDoc */
	public async signDetached (
		message: Uint8Array | string,
		privateKey: Uint8Array | IPrivateKeyring,
		additionalData?: Uint8Array | string,
		rawOutput: boolean = false
	) : Promise<Uint8Array> {
		privateKey = (
			await potassiumEncoding.openKeyring(
				PotassiumData.SignAlgorithms,
				privateKey instanceof Uint8Array ? {privateKey} : privateKey,
				this.algorithmPriorityOrderInternal
			)
		).privateKey;

		const potassiumPrivateKey = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{privateKey}
		);

		const algorithm = potassiumPrivateKey.signAlgorithm;

		let result: Uint8Array;

		switch (algorithm) {
			case PotassiumData.SignAlgorithms.NativeV1:
			case PotassiumData.SignAlgorithms.V1:
				result = await superSphincsLegacy.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.NativeV2:
				result = await superDilithiumRSA.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.V2:
				result = await superDilithium.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.NativeV2Hardened:
				result = await superSphincsRSA.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			case PotassiumData.SignAlgorithms.V2Hardened:
				result = await superSphincs.signDetached(
					message,
					potassiumPrivateKey.privateKey,
					additionalData
				);
				break;

			default:
				throw new Error('Invalid Sign algorithm (sign detached).');
		}

		if (rawOutput) {
			return result;
		}

		return potassiumEncoding.serialize({
			signature: result,
			signAlgorithm: algorithm
		});
	}

	/** @inheritDoc */
	public async verifyDetached (
		signature: Uint8Array | string,
		message: Uint8Array | string,
		publicKey: Uint8Array | IPublicKeyring,
		additionalData?: Uint8Array | string,
		forceAlgorithm?: PotassiumData.SignAlgorithms
	) : Promise<boolean> {
		const defaultMetadata = forceAlgorithm ?
			{
				...this.defaultMetadataInternal,
				signAlgorithm: forceAlgorithm
			} :
			this.defaultMetadataInternal;

		publicKey = await potassiumEncoding.openKeyring(
			PotassiumData.SignAlgorithms,
			publicKey,
			forceAlgorithm ?? this.algorithmPriorityOrderInternal
		);

		const potassiumPublicKey = await potassiumEncoding.deserialize(
			defaultMetadata,
			{publicKey}
		);
		const potassiumSignature = await potassiumEncoding.deserialize(
			defaultMetadata,
			{signature: potassiumUtil.fromBase64(signature)}
		);

		const algorithm = forceAlgorithm ?? potassiumPublicKey.signAlgorithm;

		if (
			potassiumPublicKey.signAlgorithm !== algorithm ||
			potassiumSignature.signAlgorithm !== algorithm
		) {
			throw new Error(
				'Signature - public key Sign algorithm mismatch (verify).'
			);
		}

		switch (algorithm) {
			case PotassiumData.SignAlgorithms.NativeV1:
			case PotassiumData.SignAlgorithms.V1:
				return superSphincsLegacy.verifyDetached(
					potassiumSignature.signature,
					message,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.NativeV2:
				return superDilithiumRSA.verifyDetached(
					potassiumSignature.signature,
					message,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.V2:
				return superDilithium.verifyDetached(
					potassiumSignature.signature,
					message,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.NativeV2Hardened:
				return superSphincsRSA.verifyDetached(
					potassiumSignature.signature,
					message,
					potassiumPublicKey.publicKey,
					additionalData
				);

			case PotassiumData.SignAlgorithms.V2Hardened:
				return superSphincs.verifyDetached(
					potassiumSignature.signature,
					message,
					potassiumPublicKey.publicKey,
					additionalData
				);

			default:
				throw new Error('Invalid Sign algorithm (verify).');
		}
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
