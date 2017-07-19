import {IAsyncValue} from '../../iasync-value';


/** State of a Castle Core asymmetric (future-secret) ratchet. */
export interface IAsymmetricRatchetState {
	/** Potassium.EphemeralKeyExchange private key. */
	privateKey: IAsyncValue<Uint8Array|undefined>;

	/** Potassium.EphemeralKeyExchange public key. */
	publicKey: IAsyncValue<Uint8Array|undefined>;
}
