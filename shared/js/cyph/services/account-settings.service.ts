import {Injectable} from '@angular/core';
import {SecurityModels} from '../account';
import {BinaryProto} from '../proto';
import {AccountDatabaseService} from './crypto/account-database.service';
import {FileService} from './file.service';


/**
 * Account settings service.
 */
@Injectable()
export class AccountSettingsService {
	/** @ignore */
	private async setImage (file: Blob, prop: 'avatar'|'coverImage') : Promise<void> {
		await this.accountDatabaseService.setItem(
			prop,
			BinaryProto,
			await this.fileService.getBytes(file, true),
			SecurityModels.public
		);
	}

	/** Sets the currently signed in user's avatar. */
	public async setAvatar (file: Blob) : Promise<void> {
		return this.setImage(file, 'avatar');
	}

	/** Sets the currently signed in user's cover image. */
	public async setCoverImage (file: Blob) : Promise<void> {
		return this.setImage(file, 'coverImage');
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly fileService: FileService
	) {}
}
