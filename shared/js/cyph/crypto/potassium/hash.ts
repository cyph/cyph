import {sodium} from 'libsodium';
import {superSphincs} from 'supersphincs';
import {IHash} from './ihash';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class Hash implements IHash {
	/** @inheritDoc */
	public readonly bytes: number	= superSphincs.hashBytes;

	/** @inheritDoc */
	public async deriveKey (
		input: Uint8Array,
		outputBytes?: number,
		clearInput?: boolean
	) : Promise<Uint8Array> {
		if (!outputBytes) {
			outputBytes	= input.length;
		}

		if (outputBytes > superSphincs.hashBytes) {
			throw new Error('Potassium.Hash.deriveKey output cannot exceed 64 bytes.');
		}

		const hash	= this.isNative ?
			new Uint8Array((await this.hash(input)).buffer, 0, outputBytes) :
			sodium.crypto_generichash(outputBytes, input)
		;

		if (clearInput) {
			potassiumUtil.clearMemory(input);
		}

		return hash;
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
