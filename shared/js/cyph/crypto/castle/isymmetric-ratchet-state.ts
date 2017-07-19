import {IAsyncValue} from '../../iasync-value';


/** State of a Castle Core symmetric (forward-secret) ratchet. */
export interface ISymmetricRatchetState {
	/** Potassium.SecretBox keys currently being used to encrypt/decrypt messages. */
	current: {
		incoming: IAsyncValue<Uint8Array>;
		outgoing: IAsyncValue<Uint8Array>;
	};

	/** Potassium.SecretBox keys queued up to replace current. */
	next: {
		incoming: IAsyncValue<Uint8Array>;
		outgoing: IAsyncValue<Uint8Array>;
	};
}
