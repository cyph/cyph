import {sodium} from 'libsodium';
import memoize from 'lodash-es/memoize';
import {IPotassiumData, IPrivateKeyring, PotassiumData} from '../../../proto';
import {IOneTimeAuth} from './ione-time-auth';
import * as NativeCrypto from './native-crypto';
import {potassiumEncoding} from './potassium-encoding';
import {potassiumUtil} from './potassium-util';

/** @inheritDoc */
export class OneTimeAuth implements IOneTimeAuth {
	/** @ignore */
	private readonly algorithmPriorityOrderInternal = [
		PotassiumData.OneTimeAuthAlgorithms.V1,
		PotassiumData.OneTimeAuthAlgorithms.NativeV1
	];

	/** @ignore */
	private readonly currentAlgorithmInternal = !this.isNative ?
		PotassiumData.OneTimeAuthAlgorithms.V1 :
		PotassiumData.OneTimeAuthAlgorithms.NativeV1;

	/** @ignore */
	private readonly defaultMetadataInternal: IPotassiumData & {
		oneTimeAuthAlgorithm: PotassiumData.OneTimeAuthAlgorithms;
	} = {
		oneTimeAuthAlgorithm: PotassiumData.OneTimeAuthAlgorithms.V1
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
	public readonly getBytes = memoize(
		async (
			algorithm: PotassiumData.OneTimeAuthAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.OneTimeAuthAlgorithms.NativeV1:
					return NativeCrypto.oneTimeAuth.bytes;

				case PotassiumData.OneTimeAuthAlgorithms.V1:
					return sodium.crypto_onetimeauth_BYTES;

				default:
					throw new Error('Invalid OneTimeAuth algorithm (bytes).');
			}
		}
	);

	/** @inheritDoc */
	public readonly getKeyBytes = memoize(
		async (
			algorithm: PotassiumData.OneTimeAuthAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.OneTimeAuthAlgorithms.NativeV1:
					return NativeCrypto.oneTimeAuth.keyBytes;

				case PotassiumData.OneTimeAuthAlgorithms.V1:
					return sodium.crypto_onetimeauth_KEYBYTES;

				default:
					throw new Error(
						'Invalid OneTimeAuth algorithm (key bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public async generateKey (
		algorithm: PotassiumData.OneTimeAuthAlgorithms = this
			.currentAlgorithmInternal
	) : Promise<Uint8Array> {
		return potassiumEncoding.serialize({
			key: potassiumUtil.randomBytes(await this.getKeyBytes()),
			oneTimeAuthAlgorithm: algorithm
		});
	}

	/** @inheritDoc */
	public async sign (
		message: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		rawOutput: boolean = false,
		forceAlgorithm?: PotassiumData.OneTimeAuthAlgorithms
	) : Promise<Uint8Array> {
		const defaultMetadata = forceAlgorithm ?
			{
				...this.defaultMetadataInternal,
				oneTimeAuthAlgorithm: forceAlgorithm
			} :
			this.defaultMetadataInternal;

		await sodium.ready;

		key = await potassiumEncoding.openKeyring(
			PotassiumData.OneTimeAuthAlgorithms,
			key,
			forceAlgorithm ?? this.algorithmPriorityOrderInternal
		);

		const potassiumKey = await potassiumEncoding.deserialize(
			defaultMetadata,
			{key}
		);

		const algorithm = forceAlgorithm ?? potassiumKey.oneTimeAuthAlgorithm;

		if (potassiumKey.oneTimeAuthAlgorithm !== algorithm) {
			throw new Error('OneTimeAuth algorithm mismatch (sign).');
		}

		let result: Uint8Array;

		switch (algorithm) {
			case PotassiumData.OneTimeAuthAlgorithms.NativeV1:
				result = await NativeCrypto.oneTimeAuth.sign(
					message,
					potassiumKey.key
				);
				break;

			case PotassiumData.OneTimeAuthAlgorithms.V1:
				result = sodium.crypto_onetimeauth(message, potassiumKey.key);
				break;

			default:
				throw new Error('Invalid OneTimeAuth algorithm (sign).');
		}

		if (rawOutput) {
			return result;
		}

		return potassiumEncoding.serialize({
			mac: result,
			oneTimeAuthAlgorithm: algorithm
		});
	}

	/** @inheritDoc */
	public async verify (
		mac: Uint8Array,
		message: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		forceAlgorithm?: PotassiumData.OneTimeAuthAlgorithms
	) : Promise<boolean> {
		const defaultMetadata = forceAlgorithm ?
			{
				...this.defaultMetadataInternal,
				oneTimeAuthAlgorithm: forceAlgorithm
			} :
			this.defaultMetadataInternal;

		await sodium.ready;

		const potassiumMAC = await potassiumEncoding.deserialize(
			defaultMetadata,
			{mac}
		);

		const algorithm = forceAlgorithm ?? potassiumMAC.oneTimeAuthAlgorithm;

		key = await potassiumEncoding.openKeyring(
			PotassiumData.OneTimeAuthAlgorithms,
			key,
			algorithm
		);

		const potassiumKey = await potassiumEncoding.deserialize(
			defaultMetadata,
			{key}
		);

		if (
			potassiumKey.oneTimeAuthAlgorithm !== algorithm ||
			potassiumMAC.oneTimeAuthAlgorithm !== algorithm
		) {
			throw new Error('Key-MAC OneTimeAuth algorithm mismatch (verify).');
		}

		switch (algorithm) {
			case PotassiumData.OneTimeAuthAlgorithms.NativeV1:
				return NativeCrypto.oneTimeAuth.verify(
					potassiumMAC.mac,
					message,
					potassiumKey.key
				);

			case PotassiumData.OneTimeAuthAlgorithms.V1:
				return sodium.crypto_onetimeauth_verify(
					potassiumMAC.mac,
					message,
					potassiumKey.key
				);

			default:
				throw new Error('Invalid OneTimeAuth algorithm (verify).');
		}
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
