import {UserPresence} from './enums';


/**
 * Represents one user.
 */
export class User {
	/** Username (all lowercase). */
	public readonly username: string;

	constructor (
		/** Image URI for avatar / profile picture. */
		public avatar: string,

		/** Email address. */
		public email: string,

		/** Premium account. */
		public hasPremium: boolean,

		/** Full name. */
		public name: string,

		/** @see UserPresence. */
		public status: UserPresence,

		/** Username (capitalized according to user preference). */
		public realUsername: string
	) {
		this.username	= this.realUsername.toLowerCase();
	}
}
