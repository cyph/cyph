import {Injectable} from '@angular/core';
import {AccountAuthService} from './account-auth.service';
import {FileService} from './file.service';


/**
 * Account settings service.
 */
@Injectable()
export class AccountSettingsService {
	/** @ignore */
	private async setImage (file: File, prop: 'avatar'|'coverImage') : Promise<void> {
		if (!this.accountAuthService.current) {
			throw new Error('Must sign in to set profile photo.');
		}

		if (!this.fileService.isImage(file)) {
			throw new Error('Profile photo must be an image.');
		}

		this.accountAuthService.current[prop]	=
			await this.fileService.getDataURI(file, true)
		;
	}

	/** Sets the currently signed in user's avatar. */
	public async setAvatar (file: File) : Promise<void> {
		return this.setImage(file, 'avatar');
	}

	/** Sets the currently signed in user's cover image. */
	public async setCoverImage (file: File) : Promise<void> {
		return this.setImage(file, 'coverImage');
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly fileService: FileService
	) {}
}
