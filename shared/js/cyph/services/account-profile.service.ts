import {Injectable} from '@angular/core';
import {IUser} from '../account/iuser';
import {Profile} from '../account/profile';
import {util} from '../util';
import {AccountAuthService} from './account-auth.service';
import {FileService} from './file.service';


/**
 * @see Account profile service.
 */
@Injectable()
export class AccountProfileService {
	/** Tries to to get user object for the specified user. */
	public async getProfile (
		user: IUser|undefined = this.accountAuthService.user
	) : Promise<Profile> {
		if (!user) {
			throw new Error('Cannot get profile for unspecified user.');
		}

		const externalUsernames	= ['facebook', 'keybase', 'reddit', 'twitter'].
			sort(() => util.random() > 0.5 ? -1 : 1).
			slice(0, util.random(5)).
			map(service => ({service, username: user.username}))
		;

		if (user === this.accountAuthService.user) {
			return new Profile(
				user,
				'/img/cyphphoto.jpg',
				user.username === 'ryan' ?
					'Cofounder and CEO of Cyph' :
					user.username === 'josh' ?
						'Cofounder and COO of Cyph' :
						'I am you.'
				,
				externalUsernames
			);
		}

		return new Profile(
			user,
			'/img/metaimage.png',
			`Hello, my name is ${user.name}.`,
			externalUsernames
		);
	}

	/** Sets the currently signed in user's profile photo. */
	public async setProfilePhoto (file: File) : Promise<void> {
		if (!this.accountAuthService.user) {
			throw new Error('Must sign in to set profile photo.');
		}

		if (!this.fileService.isImage(file)) {
			throw new Error('Profile photo must be an image.');
		}

		this.accountAuthService.user.avatar	= await this.fileService.getDataURI(file, true);
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly fileService: FileService
	) {}
}
