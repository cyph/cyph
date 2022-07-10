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
	private readonly currentAlgorithmInternal = !this.isNative ?
		PotassiumData.OneTimeAuthAlgorithms.V1 :
		PotassiumData.OneTimeAuthAlgorithms.NativeV1;

	/** @see PotassiumEncoding.deserialize */
	private readonly defaultMetadata: IPotassiumData & {
		oneTimeAuthAlgorithm: PotassiumData.OneTimeAuthAlgorithms;
	} = {
		oneTimeAuthAlgorithm: PotassiumData.OneTimeAuthAlgorithms.V1
	};

	/** @inheritDoc */
	public readonly currentAlgorithm = Promise.resolve(
		this.currentAlgorithmInternal
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
		rawOutput: boolean = false
	) : Promise<Uint8Array> {
		await sodium.ready;

		key = potassiumEncoding.openKeyring(
			PotassiumData.OneTimeAuthAlgorithms,
			key,
			this.currentAlgorithmInternal
		);

		const potassiumKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{key}
		);

		const algorithm = potassiumKey.oneTimeAuthAlgorithm;

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
		key: Uint8Array | IPrivateKeyring
	) : Promise<boolean> {
		await sodium.ready;

		const potassiumMAC = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{mac}
		);

		const algorithm = potassiumMAC.oneTimeAuthAlgorithm;

		key = potassiumEncoding.openKeyring(
			PotassiumData.OneTimeAuthAlgorithms,
			key,
			this.currentAlgorithmInternal
		);

		const potassiumKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{key}
		);

		if (potassiumKey.oneTimeAuthAlgorithm !== algorithm) {
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
