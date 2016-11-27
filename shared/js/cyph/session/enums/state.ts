/**
 * Session state value keys.
 */
export class State {
	/** @see State */
	public static readonly cyphId: string				= 'cyphId';

	/** @see State */
	public static readonly isAlive: string				= 'isAlive';

	/** @see State */
	public static readonly isAlice: string				= 'isAlice';

	/** @see State */
	public static readonly isStartingNewCyph: string	= 'isStartingNewCyph';

	/** @see State */
	public static readonly sharedSecret: string			= 'sharedSecret';

	/** @see State */
	public static readonly wasInitiatedByAPI: string	= 'wasInitiatedByAPI';
}
