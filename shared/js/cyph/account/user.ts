import {IAccountUserProfile} from '../../proto';
import {DataURIProto} from '../protos';
import {util} from '../util';
import {UserPresence} from './enums';


/**
 * Represents a user profile.
 */
export class User {
	/** Image URI for avatar / profile picture. */
	public avatar: string		= DataURIProto.create();

	/** Image URI for cover image. */
	public coverImage: string	= DataURIProto.create();

	/** @see IAccountUserProfile.description */
	public description: string;

	/** @see IAccountUserProfile.externalUsernames */
	public readonly externalUsernames: {[k: string]: string};

	/** @see IAccountUserProfile.hasPremium */
	public hasPremium: boolean;

	/** @see IAccountUserProfile.name */
	public name: string;

	/** @see IAccountUserProfile.realUsername */
	public realUsername: string;

	/** @see IAccountUserProfile.status */
	public status: UserPresence;

	/** Username (all lowercase). */
	public readonly username: string;

	/** Exports to IAccountUserProfile format. */
	public async toAccountUserProfile () : Promise<IAccountUserProfile> {
		return {
			avatar: await util.serialize(DataURIProto, this.avatar),
			coverImage: await util.serialize(DataURIProto, this.coverImage),
			description: this.description,
			externalUsernames: this.externalUsernames,
			hasPremium: this.hasPremium,
			name: this.name,
			realUsername: this.realUsername,
			status: this.status
		};
	}

	constructor (accountUserProfile: IAccountUserProfile) {
		this.description		= accountUserProfile.description;
		this.externalUsernames	= accountUserProfile.externalUsernames || {};
		this.hasPremium			= accountUserProfile.hasPremium;
		this.name				= accountUserProfile.name;
		this.status				= accountUserProfile.status;
		this.username			= accountUserProfile.realUsername.toLowerCase();

		(async () => {
			this.avatar		= await util.deserialize(DataURIProto, accountUserProfile.avatar);
			this.coverImage	= await util.deserialize(DataURIProto, accountUserProfile.coverImage);
		})();
	}
}
