import {util} from '../util';
import {User} from './user';


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
		/** @see User */
		public user: User,

		/** Image URI for cover image. */
		public coverImage: string = '',

		/** Description. */
		public description: string = '',

		externalUsernames?: {service: string; username: string}[]
	) {
		/* Mock external usernames for now */
		if (!externalUsernames) {
			externalUsernames	= ['facebook', 'keybase', 'reddit', 'twitter'].
				sort(() => util.random() > 0.5 ? -1 : 1).
				slice(0, util.random(5)).
				map(service => ({service, username: user ? user.username : ''}))
			;
		}

		for (const o of externalUsernames) {
			this.externalUsernames.set(<any> o.service, o.username);
		}
	}
}
