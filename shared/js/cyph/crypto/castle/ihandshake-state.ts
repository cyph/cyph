import {IAsyncValue} from '../../iasync-value';
import {HandshakeSteps} from './enums';


/** Pairwise session handshake state. */
export interface IHandshakeState {
	/* Current step of the handshake process. */
	currentStep: IAsyncValue<HandshakeSteps>;

	/* Initial secret to bootstrap Castle Core asymmetric ratchet. */
	initialSecret: IAsyncValue<Uint8Array|undefined>;

	/*
	 * Alice's contribution to the initial secret to bootstrap the
	 * Castle Core asymmetric ratchet, encrypted with Potassium.Box.
	 */
	initialSecretAliceCyphertext: IAsyncValue<Uint8Array>;

	/*
	 * Bob's contribution to the initial secret to bootstrap the
	 * Castle Core asymmetric ratchet, encrypted with Potassium.Box.
	 */
	initialSecretBobCyphertext: IAsyncValue<Uint8Array>;

	/* Indicates whether or not this is Alice. */
	isAlice: boolean;

	/* Current party's Potassium.Box public key, where applicable. */
	localPublicKey: IAsyncValue<Uint8Array>;

	/* Other party's Potassium.Box public key, where applicable. */
	remotePublicKey: IAsyncValue<Uint8Array>;
}
