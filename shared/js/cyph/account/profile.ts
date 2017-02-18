import {IUser} from './iuser';


/**
 * Represents a user profile.
 */
export class Profile {
	/** Usernames and similar identifiers for external services like social media. */
	public externalUsernames	= new Map<
		'email'|'facebook'|'keybase'|'phone'|'reddit'|'twitter',
		string
	>();

	constructor (
		/** @see IUser */
		public user: IUser,

		/** Image URI for cover image. */
		public coverImage: string = '',

		/** Description. */
		public description: string = '',

		externalUsernames: {service: string; username: string}[] = []
	) {
		for (const o of externalUsernames) {
			this.externalUsernames.set(<any> o.service, o.username);
		}
	}
}
