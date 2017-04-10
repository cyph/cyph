import {util} from '../util';
import {UserPresence} from './enums';


/**
 * Represents a user profile.
 */
export class User {
	/** Usernames and similar identifiers for external services like social media. */
	public externalUsernames	= new Map<
		'email'|'facebook'|'keybase'|'phone'|'reddit'|'twitter',
		string
	>();

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

		externalUsernames?: {service: string; username: string}[]
	) {
		this.username	= this.realUsername.toLowerCase();

		/* Mock external usernames for now */
		if (!externalUsernames) {
			externalUsernames	= ['facebook', 'keybase', 'reddit', 'twitter'].
				sort(() => util.random() > 0.5 ? -1 : 1).
				slice(0, util.random(5)).
				map(service => ({service, username: this.username}))
			;
		}

		for (const o of externalUsernames) {
			this.externalUsernames.set(<any> o.service, o.username);
		}
	}
}
