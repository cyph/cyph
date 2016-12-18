import {lib} from './lib';
import {util} from './util';


/** Equivalent to sodium.crypto_generichash. */
export class Hash {
	/** Hash length. */
	public readonly bytes: number	= lib.superSphincs.hashBytes;

	/** Stretches input to the specified number of bytes. */
	public async deriveKey (
		input: Uint8Array,
		outputBytes?: number,
		clearInput?: boolean
	) : Promise<Uint8Array> {
		if (!outputBytes) {
			outputBytes	= input.length;
		}

		if (outputBytes > lib.superSphincs.hashBytes) {
			throw new Error('Potassium.Hash.deriveKey output cannot exceed 64 bytes.');
		}

		const hash	= this.isNative ?
			new Uint8Array((await this.hash(input)).buffer, 0, outputBytes) :
			lib.sodium.crypto_generichash(outputBytes, input)
		;

		if (clearInput) {
			util.clearMemory(input);
		}

		return hash;
	}

	/** Hashes plaintext. */
	public async hash (plaintext: Uint8Array|string) : Promise<Uint8Array> {
		return lib.superSphincs.hash(plaintext, true);
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
