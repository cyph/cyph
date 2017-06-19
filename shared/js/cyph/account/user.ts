import {UserPresence} from './enums';


/**
 * Represents a user profile.
 */
export class User {
	/** Username (all lowercase). */
	public readonly username: string;

	constructor (
		/** Image URI for avatar / profile picture. */
		public avatar: string,

		/** Image URI for cover image. */
		public coverImage: string = '',

		/** Description. */
		public description: string = '',

		/** Email address. */
		public email: string,

		/** Premium account. */
		public hasPremium: boolean,

		/** Full name. */
		public name: string,

		/** Username (capitalized according to user preference). */
		public realUsername: string,

		/** @see UserPresence. */
		public status: UserPresence,

		/** Usernames and similar identifiers for external services like social media. */
		public readonly externalUsernames: {
			email?: string;
			facebook?: string;
			keybase?: string;
			phone?: string;
			reddit?: string;
			twitter?: string;
		} = {}
	) {
		this.username	= this.realUsername.toLowerCase();
	}
}
