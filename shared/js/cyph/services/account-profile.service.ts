import {Injectable} from '@angular/core';
import {Profile} from '../account/profile';
import {AccountAuthService} from './account-auth.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {FileService} from './file.service';


/**
 * Account profile service.
 */
@Injectable()
export class AccountProfileService {
	/** Tries to to get user object for the specified user. */
	public async getProfile (username?: string) : Promise<Profile> {
		await this.accountAuthService.ready;

		if (!username) {
			if (this.accountAuthService.current) {
				return this.accountAuthService.current;
			}
			else {
				throw new Error('Cannot get profile for unspecified user.');
			}
		}

		const user	= await this.accountUserLookupService.getUser(username);

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
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly fileService: FileService
	) {}
}
