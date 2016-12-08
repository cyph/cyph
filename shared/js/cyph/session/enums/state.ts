/**
 * Session state value keys.
 */
export class State {
	/** @see State */
	public readonly cyphId: string				= 'cyphId';

	/** @see State */
	public readonly isAlive: string				= 'isAlive';

	/** @see State */
	public readonly isAlice: string				= 'isAlice';

	/** @see State */
	public readonly isStartingNewCyph: string	= 'isStartingNewCyph';

	/** @see State */
	public readonly sharedSecret: string		= 'sharedSecret';

	/** @see State */
	public readonly wasInitiatedByAPI: string	= 'wasInitiatedByAPI';

	constructor () {}
}

/** @see State */
export const state	= new State();
