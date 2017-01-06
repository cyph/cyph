import {potassiumUtil} from './potassium-util';


/** Equivalent to sodium.crypto_generichash. */
export class Hash {
	/** Hash length. */
	public readonly bytes: number	= superSphincs.hashBytes;

	/** Stretches input to the specified number of bytes. */
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

	/** Hashes plaintext. */
	public async hash (plaintext: Uint8Array|string) : Promise<Uint8Array> {
		return superSphincs.hash(plaintext, true);
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
