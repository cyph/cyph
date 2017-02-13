import {UserPresence} from './enums';


/**
 * Represents one user.
 */
export interface IUser {
	/** Image URI for avatar / profile picture. */
	avatar: string;

	/** Full name. */
	name: string;

	/** @see UserPresence. */
	status: UserPresence;

	/** Username. */
	username: string;
}
