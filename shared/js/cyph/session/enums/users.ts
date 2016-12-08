/**
 * Representations of users in a session.
 */
export class Users {
	/** @see Users */
	public readonly app: string		= 'app';

	/** @see Users */
	public readonly me: string		= 'me';

	/** @see Users */
	public readonly other: string	= 'other';

	constructor () {}
}

/** @see Users */
export const users	= new Users();
