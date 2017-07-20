import {IAsyncValue} from '../../iasync-value';


/** A possibly-undefined ISymmetricRatchetState. */
export interface ISymmetricRatchetStateMaybe {
	/** @see ISymmetricRatchetState.current */
	current: {
		incoming: IAsyncValue<Uint8Array|undefined>;
		outgoing: IAsyncValue<Uint8Array|undefined>;
	};

	/** @see ISymmetricRatchetState.next */
	next: {
		incoming: IAsyncValue<Uint8Array|undefined>;
		outgoing: IAsyncValue<Uint8Array|undefined>;
	};
}
