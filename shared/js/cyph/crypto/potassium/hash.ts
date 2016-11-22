import {Lib} from './lib';
import {Util} from './util';


/** Equivalent to sodium.crypto_generichash. */
export class Hash {
	/** Hash length. */
	public bytes: number	= Lib.superSphincs.hashBytes;

	/** Hashes plaintext. */
	public async hash (plaintext: Uint8Array|string) : Promise<Uint8Array> {
		return Lib.superSphincs.hash(plaintext, true);
	}

	/** Stretches input to the specified number of bytes. */
	public async deriveKey (
		input: Uint8Array,
		outputBytes?: number,
		clearInput?: boolean
	) : Promise<Uint8Array> {
		if (!outputBytes) {
			outputBytes	= input.length;
		}

		if (outputBytes > Lib.superSphincs.hashBytes) {
			throw new Error('Potassium.Hash.deriveKey output cannot exceed 64 bytes.');
		}

		const hash	= this.isNative ?
			new Uint8Array((await this.hash(input)).buffer, 0, outputBytes) :
			Lib.sodium.crypto_generichash(outputBytes, input)
		;

		if (clearInput) {
			Util.clearMemory(input);
		}

		return hash;
	}

	constructor (
		/** @ignore */
		private isNative: boolean
	) {}
}
