import {environment} from '../../../environments/environment';
import {
	ICombinedSignature,
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../../proto';
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
	private readonly cryptographicAgilityTag = this.useCryptographicAgilityTag ?
		potassiumUtil.fromHex(
			'30c463523ae566808f8ff4421382a651177fc0d9b57a3c21954052d2e91aecd2'
		) :
		undefined;

	/**
	 * Deserializes bytes to `PotassiumData` object.
	 * @param defaultMetadata In the event that the value does not start with
	 * `cryptographicAgilityTag` (when applicable), it will be used as the
	 * data of a new `PotassiumData` object with the metadata from
	 * `defaultMetadata` included.
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
			| {signed: ICombinedSignature & {signatureBytes: number}}
	> (defaultMetadata: T, valueContainer: V) : Promise<T & V> {
		const [defaultValueKey, value] = <
			[
				string,
				Uint8Array | (ICombinedSignature & {signatureBytes: number})
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
							message: potassiumUtil.toBytes(
									value.signature,
									value.signatureBytes
								),
							signature: potassiumUtil.toBytes(
									value.signature,
									0,
									value.signatureBytes
								),
							signatureBytes: value.signatureBytes
						}
			};
		}

		const data = await deserialize(
			PotassiumData,
			this.cryptographicAgilityTag !== undefined ?
				potassiumUtil.toBytes(
					bytes,
					this.cryptographicAgilityTag.length
				) :
				bytes
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
		algorithm: PotassiumData.BoxAlgorithms
	) : TKeyPair;
	public openKeyring<TKeyPair extends IKeyPair | {privateKey: Uint8Array}> (
		algorithmType: typeof PotassiumData.EphemeralKeyExchangeAlgorithms,
		keyring: TKeyPair | IPrivateKeyring,
		algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms
	) : TKeyPair;
	public openKeyring (
		algorithmType: typeof PotassiumData.OneTimeAuthAlgorithms,
		keyring: Uint8Array | IPrivateKeyring,
		algorithm: PotassiumData.OneTimeAuthAlgorithms
	) : Uint8Array;
	public openKeyring (
		algorithmType: typeof PotassiumData.SecretBoxAlgorithms,
		keyring: Uint8Array | IPrivateKeyring,
		algorithm: PotassiumData.SecretBoxAlgorithms
	) : Uint8Array;
	public openKeyring<TKeyPair extends IKeyPair | {privateKey: Uint8Array}> (
		algorithmType: typeof PotassiumData.SignAlgorithms,
		keyring: TKeyPair | IPrivateKeyring,
		algorithm: PotassiumData.SignAlgorithms
	) : TKeyPair;
	public openKeyring (
		algorithmType: typeof PotassiumData.BoxAlgorithms,
		keyring: Uint8Array | IPublicKeyring,
		algorithm: PotassiumData.BoxAlgorithms
	) : Uint8Array;
	public openKeyring (
		algorithmType: typeof PotassiumData.EphemeralKeyExchangeAlgorithms,
		keyring: Uint8Array | IPublicKeyring,
		algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms
	) : Uint8Array;
	public openKeyring (
		algorithmType: typeof PotassiumData.SignAlgorithms,
		keyring: Uint8Array | IPublicKeyring,
		algorithm: PotassiumData.SignAlgorithms
	) : Uint8Array;
	public openKeyring (
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
		algorithm:
			| PotassiumData.BoxAlgorithms
			| PotassiumData.EphemeralKeyExchangeAlgorithms
			| PotassiumData.OneTimeAuthAlgorithms
			| PotassiumData.SecretBoxAlgorithms
			| PotassiumData.SignAlgorithms
	) : Uint8Array | IKeyPair | {privateKey: Uint8Array} {
		if (keyring instanceof Uint8Array || 'privateKey' in keyring) {
			return keyring;
		}

		let algorithmTypeName: string | undefined;
		let result:
			| Uint8Array
			| {privateKey: Uint8Array}
			| IKeyPair
			| undefined;

		switch (algorithmType) {
			case PotassiumData.BoxAlgorithms:
				algorithmTypeName = 'BoxAlgorithms';
				result =
					'boxPrivateKeys' in keyring ?
						keyring.boxPrivateKeys?.[algorithm] :
					'boxPublicKeys' in keyring ?
						keyring.boxPublicKeys?.[algorithm] :
						undefined;
				break;

			case PotassiumData.EphemeralKeyExchangeAlgorithms:
				algorithmTypeName = 'EphemeralKeyExchangeAlgorithms';
				result =
					'ephemeralKeyExchangePrivateKeys' in keyring ?
						keyring.ephemeralKeyExchangePrivateKeys?.[algorithm] :
					'ephemeralKeyExchangePublicKeys' in keyring ?
						keyring.ephemeralKeyExchangePublicKeys?.[algorithm] :
						undefined;
				break;

			case PotassiumData.OneTimeAuthAlgorithms:
				algorithmTypeName = 'OneTimeAuthAlgorithms';
				result =
					'oneTimeAuthPrivateKeys' in keyring ?
						keyring.oneTimeAuthPrivateKeys?.[algorithm] :
						undefined;
				break;

			case PotassiumData.SecretBoxAlgorithms:
				algorithmTypeName = 'SecretBoxAlgorithms';
				result =
					'secretBoxPrivateKeys' in keyring ?
						keyring.secretBoxPrivateKeys?.[algorithm] :
						undefined;
				break;

			case PotassiumData.SignAlgorithms:
				algorithmTypeName = 'SignAlgorithms';
				result =
					'signPrivateKeys' in keyring ?
						keyring.signPrivateKeys?.[algorithm] :
					'signPublicKeys' in keyring ?
						keyring.signPublicKeys?.[algorithm] :
						undefined;
				break;
		}

		if (result === undefined) {
			throw new Error(
				`Key not found for algorithm ${
					algorithmTypeName ?? '(unknown)'
				}.${algorithmType[algorithm] ?? '(unknown)'} in keyring.`
			);
		}

		return result;
	}

	/** Serializes `PotassiumData` object to binary byte array. */
	public async serialize (
		data: IPotassiumData,
		clearOriginals: boolean = true
	) : Promise<Uint8Array> {
		const bytes = await serialize(PotassiumData, data);

		if (this.cryptographicAgilityTag === undefined) {
			return bytes;
		}

		try {
			return potassiumUtil.concatMemory(
				false,
				this.cryptographicAgilityTag,
				bytes
			);
		}
		finally {
			potassiumUtil.clearMemory(bytes);

			if (clearOriginals) {
				potassiumUtil.clearMemory(data.cyphertext);
				potassiumUtil.clearMemory(data.key);
				potassiumUtil.clearMemory(data.privateKey);
				potassiumUtil.clearMemory(data.publicKey);
				potassiumUtil.clearMemory(data.secret);
				potassiumUtil.clearMemory(data.signature);
				potassiumUtil.clearMemory(data.signed?.message);
				potassiumUtil.clearMemory(data.signed?.signature);
			}
		}
	}

	constructor (
		/** Indicates whether cryptographicAgilityTag should be used. */
		private readonly useCryptographicAgilityTag: boolean = true
	) {}
}

/** @see PotassiumEncoding */
export const potassiumEncoding = new PotassiumEncoding(
	/* Use cryptographic agility tag in the main environment and where configured */
	!environment.customBuild ||
		environment.customBuild.config.useCryptographicAgilityTag === true
);
