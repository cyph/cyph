import {ICastleRatchetState} from '../../proto';
import {IPotassium} from '../potassium/ipotassium';


/**
 * A simplified Castle Core with no order enforcement or forward secrecy.
 */
export class CoreLite {
	/**
	 * Decrypt incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 */
	public async decrypt (cyphertext: Uint8Array) : Promise<Uint8Array> {
		return this.potassium.secretBox.open(
			cyphertext,
			this.ratchetState.symmetric.current.incoming
		);
	}

	/**
	 * Encrypt outgoing plaintext.
	 * @param plaintext Data to be encrypted.
	 */
	public async encrypt (plaintext: Uint8Array) : Promise<Uint8Array> {
		return this.potassium.secretBox.seal(
			plaintext,
			this.ratchetState.symmetric.current.outgoing
		);
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @see ICastleRatchetState */
		public readonly ratchetState: ICastleRatchetState
	) {}
}
