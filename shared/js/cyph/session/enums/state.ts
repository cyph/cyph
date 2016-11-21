/**
 * Session state value keys.
 */
export class State {
	/** @see State */
	public static cyphId: string			= 'cyphId';

	/** @see State */
	public static isAlive: string			= 'isAlive';

	/** @see State */
	public static isAlice: string			= 'isAlice';

	/** @see State */
	public static isStartingNewCyph: string	= 'isStartingNewCyph';

	/** @see State */
	public static sharedSecret: string		= 'sharedSecret';

	/** @see State */
	public static wasInitiatedByAPI: string	= 'wasInitiatedByAPI';
}
