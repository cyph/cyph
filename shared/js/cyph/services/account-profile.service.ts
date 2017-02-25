import {Injectable} from '@angular/core';
import {IUser} from '../account/iuser';
import {Profile} from '../account/profile';
import {AccountAuthService} from './account-auth.service';
import {FileService} from './file.service';


/**
 * @see Account profile service.
 */
@Injectable()
export class AccountProfileService {
	/** Tries to to get user object for the specified user. */
	public async getProfile (user?: IUser) : Promise<Profile> {
		await this.accountAuthService.ready;

		if (!user) {
			if (this.accountAuthService.current) {
				return this.accountAuthService.current;
			}
			else {
				throw new Error('Cannot get profile for unspecified user.');
			}
		}

		return new Profile(
			user,
			'/img/metaimage.png',
			`Hello, my name is ${user.name}.`
		);
	}

	/** Sets the currently signed in user's profile photo. */
	public async setProfilePhoto (file: File) : Promise<void> {
		if (!this.accountAuthService.current) {
			throw new Error('Must sign in to set profile photo.');
		}

		if (!this.fileService.isImage(file)) {
			throw new Error('Profile photo must be an image.');
		}

		this.accountAuthService.current.user.avatar	=
			await this.fileService.getDataURI(file, true)
		;
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly fileService: FileService
	) {}
}
