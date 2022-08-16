import {
	ICombinedSignature,
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../../proto';
import {MaybeArray} from '../../maybe-array-type';
import {deserialize, serialize} from '../../util/serialization';
import {potassiumUtil} from './potassium-util';

/**
 * Handles encoding of Potassium data.
 */
export class PotassiumEncoding {
	/**
	 * Prefix used to indicate a protobuf-encoded `PotassiumData` object.
	 * This enables backwards compatibility in environments with legacy data.
	 */
	private readonly cryptographicAgilityTag = potassiumUtil.fromHex(
		'30c463523ae566808f8ff4421382a651177fc0d9b57a3c21954052d2e91aecd2'
	);

	/**
	 * Deserializes bytes to `PotassiumData` object.
	 * @param defaultMetadata In the event that the value does not start with
	 * `cryptographicAgilityTag`, it will be used as the data of a new
	 * `PotassiumData` object with the metadata from `defaultMetadata` included.
	 */
	public async deserialize<
		T extends IPotassiumData,
		V extends
			| {cyphertext: Uint8Array}
			| {key: Uint8Array}
			| {mac: Uint8Array}
			| {privateKey: Uint8Array}
			| {publicKey: Uint8Array}
			| {secret: Uint8Array}
			| {signature: Uint8Array}
			| {signed: ICombinedSignature & {defaultSignatureBytes: number}}
	> (defaultMetadata: T, valueContainer: V) : Promise<T & V> {
		const [defaultValueKey, value] = <
			[
				string,
				(
					| Uint8Array
					| (ICombinedSignature & {defaultSignatureBytes: number})
				)
			]
		> Object.entries(valueContainer)[0];

		const bytes =
			value instanceof Uint8Array ?
				value :
				/* Handle combined signature special case */
				value.signature;

		if (!potassiumUtil.startsWith(bytes, this.cryptographicAgilityTag)) {
			return <any> {
				...defaultMetadata,
				[defaultValueKey]:
					value instanceof Uint8Array ?
						value :
						/* Handle combined signature special case */
						{
							compressed: value.compressed,
							defaultSignatureBytes: value.defaultSignatureBytes,
							message: potassiumUtil.toBytes(
									value.signature,
									value.defaultSignatureBytes
								),
							signature: potassiumUtil.toBytes(
									value.signature,
									0,
									value.defaultSignatureBytes
								)
						}
			};
		}

		const data = await deserialize(
			PotassiumData,
			potassiumUtil.toBytes(bytes, this.cryptographicAgilityTag.length)
		);

		const requiredKeys = <(keyof IPotassiumData)[]> (
			Object.keys(defaultMetadata).concat(defaultValueKey)
		);

		for (const k of requiredKeys) {
			if (data[k] !== undefined && data[k] !== 0) {
				continue;
			}

			throw new Error(
				`Missing property in deserialized Potassium data: ${k}.\n\n` +
					`Expected properties: ${requiredKeys.sort().join(', ')}\n` +
					`Actual properties: ${Object.keys(data).sort().join(', ')}`
			);
		}

		return <any> data;
	}

	/** Extracts a key from the keyring. */
	public openKeyring<TKeyPair extends IKeyPair | {privateKey: Uint8Array}> (
		algorithmType: typeof PotassiumData.BoxAlgorithms,
		keyring: TKeyPair | IPrivateKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.BoxAlgorithms>
	) : Promise<TKeyPair>;
	public openKeyring<TKeyPair extends IKeyPair | {privateKey: Uint8Array}> (
		algorithmType: typeof PotassiumData.EphemeralKeyExchangeAlgorithms,
		keyring: TKeyPair | IPrivateKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.EphemeralKeyExchangeAlgorithms>
	) : Promise<TKeyPair>;
	public openKeyring (
		algorithmType: typeof PotassiumData.OneTimeAuthAlgorithms,
		keyring: Uint8Array | IPrivateKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.OneTimeAuthAlgorithms>
	) : Promise<Uint8Array>;
	public openKeyring (
		algorithmType: typeof PotassiumData.SecretBoxAlgorithms,
		keyring: Uint8Array | IPrivateKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.SecretBoxAlgorithms>
	) : Promise<Uint8Array>;
	public openKeyring<TKeyPair extends IKeyPair | {privateKey: Uint8Array}> (
		algorithmType: typeof PotassiumData.SignAlgorithms,
		keyring: TKeyPair | IPrivateKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.SignAlgorithms>
	) : Promise<TKeyPair>;
	public openKeyring (
		algorithmType: typeof PotassiumData.BoxAlgorithms,
		keyring: Uint8Array | IPublicKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.BoxAlgorithms>
	) : Promise<Uint8Array>;
	public openKeyring (
		algorithmType: typeof PotassiumData.EphemeralKeyExchangeAlgorithms,
		keyring: Uint8Array | IPublicKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.EphemeralKeyExchangeAlgorithms>
	) : Promise<Uint8Array>;
	public openKeyring (
		algorithmType: typeof PotassiumData.SignAlgorithms,
		keyring: Uint8Array | IPublicKeyring,
		algorithmPriorityOrder: MaybeArray<PotassiumData.SignAlgorithms>
	) : Promise<Uint8Array>;
	public async openKeyring (
		algorithmType:
			| typeof PotassiumData.BoxAlgorithms
			| typeof PotassiumData.EphemeralKeyExchangeAlgorithms
			| typeof PotassiumData.OneTimeAuthAlgorithms
			| typeof PotassiumData.SecretBoxAlgorithms
			| typeof PotassiumData.SignAlgorithms,
		keyring:
			| Uint8Array
			| IKeyPair
			| {privateKey: Uint8Array}
			| IPrivateKeyring
			| IPublicKeyring,
		algorithmPriorityOrder: MaybeArray<
			| PotassiumData.BoxAlgorithms
			| PotassiumData.EphemeralKeyExchangeAlgorithms
			| PotassiumData.OneTimeAuthAlgorithms
			| PotassiumData.SecretBoxAlgorithms
			| PotassiumData.SignAlgorithms
		>
	) : Promise<Uint8Array | IKeyPair | {privateKey: Uint8Array}> {
		if (keyring instanceof Uint8Array || 'privateKey' in keyring) {
			return keyring;
		}

		const algorithms =
			algorithmPriorityOrder instanceof Array ?
				algorithmPriorityOrder :
				[algorithmPriorityOrder];

		let algorithmTypeName: string | undefined;
		let result:
			| Uint8Array
			| {privateKey: Uint8Array}
			| IKeyPair
			| undefined;

		const getKey = async <TKey extends Uint8Array | IKeyPair>(
			keyGroup: Record<string, TKey> | undefined,
			algorithmKey:
				| 'boxAlgorithm'
				| 'ephemeralKeyExchangeAlgorithm'
				| 'oneTimeAuthAlgorithm'
				| 'secretBoxAlgorithm'
				| 'signAlgorithm',
			valueKey: 'key' | 'privateKey' | 'publicKey'
		) => {
			if (keyGroup === undefined) {
				return undefined;
			}

			const getWrappedValue = async (
				algorithm: typeof algorithms[0],
				value: Uint8Array
			) : Promise<Uint8Array> =>
				potassiumUtil.startsWith(value, this.cryptographicAgilityTag) ?
					value :
					this.serialize({
						[algorithmKey]: algorithm,
						[valueKey]: value
					});

			for (const algorithm of algorithms) {
				const key = keyGroup[algorithm];

				if (key instanceof Uint8Array) {
					return getWrappedValue(algorithm, key);
				}
				else if (typeof key === 'object') {
					return {
						privateKey: await getWrappedValue(
							algorithm,
							key.privateKey
						),
						publicKey: await getWrappedValue(
							algorithm,
							key.publicKey
						)
					};
				}
			}

			return undefined;
		};

		switch (algorithmType) {
			case PotassiumData.BoxAlgorithms:
				algorithmTypeName = 'BoxAlgorithms';
				result =
					'boxPrivateKeys' in keyring ?
						await getKey(
							keyring.boxPrivateKeys,
							'boxAlgorithm',
							'privateKey'
						) :
					'boxPublicKeys' in keyring ?
						await getKey(
							keyring.boxPublicKeys,
							'boxAlgorithm',
							'publicKey'
						) :
						undefined;
				break;

			case PotassiumData.EphemeralKeyExchangeAlgorithms:
				algorithmTypeName = 'EphemeralKeyExchangeAlgorithms';
				result =
					'ephemeralKeyExchangePrivateKeys' in keyring ?
						await getKey(
							keyring.ephemeralKeyExchangePrivateKeys,
							'ephemeralKeyExchangeAlgorithm',
							'privateKey'
						) :
					'ephemeralKeyExchangePublicKeys' in keyring ?
						await getKey(
							keyring.ephemeralKeyExchangePublicKeys,
							'ephemeralKeyExchangeAlgorithm',
							'publicKey'
						) :
						undefined;
				break;

			case PotassiumData.OneTimeAuthAlgorithms:
				algorithmTypeName = 'OneTimeAuthAlgorithms';
				result =
					'oneTimeAuthPrivateKeys' in keyring ?
						await getKey(
							keyring.oneTimeAuthPrivateKeys,
							'oneTimeAuthAlgorithm',
							'key'
						) :
						undefined;
				break;

			case PotassiumData.SecretBoxAlgorithms:
				algorithmTypeName = 'SecretBoxAlgorithms';
				result =
					'secretBoxPrivateKeys' in keyring ?
						await getKey(
							keyring.secretBoxPrivateKeys,
							'secretBoxAlgorithm',
							'key'
						) :
						undefined;
				break;

			case PotassiumData.SignAlgorithms:
				algorithmTypeName = 'SignAlgorithms';
				result =
					'signPrivateKeys' in keyring ?
						await getKey(
							keyring.signPrivateKeys,
							'signAlgorithm',
							'privateKey'
						) :
					'signPublicKeys' in keyring ?
						await getKey(
							keyring.signPublicKeys,
							'signAlgorithm',
							'publicKey'
						) :
						undefined;
				break;
		}

		if (result === undefined) {
			throw new Error(
				`Key not found for algorithm ${
					algorithmTypeName ?? '(unknown)'
				}.${algorithms
					.map(algorithm => algorithmType[algorithm] ?? '(unknown)')
					.join('|')} in keyring.`
			);
		}

		return result;
	}

	/** Serializes `PotassiumData` object to binary byte array. */
	public async serialize (
		data: IPotassiumData,
		dataClearBlacklist?: Uint8Array[]
	) : Promise<Uint8Array> {
		const bytes = await serialize(PotassiumData, data);

		try {
			return potassiumUtil.concatMemory(
				false,
				this.cryptographicAgilityTag,
				bytes
			);
		}
		finally {
			potassiumUtil.clearMemory(bytes);

			const dataClearBlacklistSet = new Set(dataClearBlacklist);

			for (const dataToClear of [
				data.cyphertext,
				data.key,
				data.privateKey,
				data.publicKey,
				data.secret,
				data.signature,
				data.signed?.message,
				data.signed?.signature
			]) {
				if (
					dataToClear !== undefined &&
					!dataClearBlacklistSet.has(dataToClear)
				) {
					potassiumUtil.clearMemory(dataToClear);
				}
			}
		}
	}

	constructor () {}
}

/** @see PotassiumEncoding */
export const potassiumEncoding = new PotassiumEncoding();
