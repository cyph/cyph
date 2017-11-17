import {Injectable} from '@angular/core';
import {SecurityModels} from '../account';
import {BlobProto} from '../proto';
import {AccountDatabaseService} from './crypto/account-database.service';


/**
 * Account settings service.
 */
@Injectable()
export class AccountSettingsService {
	/** @ignore */
	private async setImage (file: File, prop: 'avatar'|'coverImage') : Promise<void> {
		await this.accountDatabaseService.setItem(prop, BlobProto, file, SecurityModels.public);
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
		private readonly accountDatabaseService: AccountDatabaseService
	) {}
}
