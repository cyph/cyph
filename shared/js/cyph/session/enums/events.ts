/**
 * Session-related events that may be handled throughout the codes.
 */
export class Events {
	/** @see Events */
	public static readonly abort: string				= 'abort';

	/** @see Events */
	public static readonly beginChat: string			= 'beginChat';

	/** @see Events */
	public static readonly beginChatComplete: string	= 'beginChatComplete';

	/** @see Events */
	public static readonly beginWaiting: string			= 'beginWaiting';

	/** @see Events */
	public static readonly castle: string				= 'castle';

	/** @see Events */
	public static readonly closeChat: string			= 'closeChat';

	/** @see Events */
	public static readonly connect: string				= 'connect';

	/** @see Events */
	public static readonly connectFailure: string		= 'connectFailure';

	/** @see Events */
	public static readonly cyphertext: string			= 'cyphertext';

	/** @see Events */
	public static readonly filesUI: string				= 'filesUI';

	/** @see Events */
	public static readonly newCyph: string				= 'newCyph';

	/** @see Events */
	public static readonly p2pUI: string				= 'p2pUI';
}
