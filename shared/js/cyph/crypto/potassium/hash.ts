import {sodium} from 'libsodium';
import {superSphincs} from 'supersphincs';
import {IHash} from './ihash';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class Hash implements IHash {
	/** @inheritDoc */
	public readonly bytes: Promise<number>	= superSphincs.hashBytes;

	/** @inheritDoc */
	public async deriveKey (
		input: Uint8Array|string,
		outputBytes?: number,
		clearInput?: boolean
	) : Promise<Uint8Array> {
		if (typeof input === 'string') {
			input		= potassiumUtil.fromString(input);
			clearInput	= true;
		}

		try {
			const bytes	= await this.bytes;

			if (!outputBytes) {
				outputBytes	= input.length;
			}

			if (outputBytes > bytes) {
				throw new Error(
					`Potassium.Hash.deriveKey output cannot exceed ${bytes} bytes.`
				);
			}

			if (!this.isNative) {
				await sodium.ready;
				return sodium.crypto_generichash(outputBytes, input);
			}

			const hash	= await this.hash(input);
			return potassiumUtil.toBytes(hash, 0, outputBytes);
		}
		finally {
			if (clearInput) {
				potassiumUtil.clearMemory(input);
			}
		}
	}

	/** @inheritDoc */
	public async hash (plaintext: Uint8Array|string) : Promise<Uint8Array> {
		return superSphincs.hash(plaintext, true);
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
