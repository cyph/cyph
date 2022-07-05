import {environment} from '../../../environments/environment';
import {ICombinedSignature, IPotassiumData, PotassiumData} from '../../proto';
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

		const data = await deserialize(PotassiumData, bytes);
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
