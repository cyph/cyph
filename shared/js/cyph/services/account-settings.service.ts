import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {CyphPlans, SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {IFile} from '../ifile';
import {BinaryProto} from '../proto';
import {AccountDatabaseService} from './crypto/account-database.service';
import {FileService} from './file.service';


/**
 * Account settings service.
 */
@Injectable()
export class AccountSettingsService extends BaseProvider {
	/** User's plan / premium status. */
	public readonly plan	= new BehaviorSubject<CyphPlans>(CyphPlans.free);

	/** @ignore */
	private async setImage (file: IFile, prop: 'avatar'|'coverImage') : Promise<void> {
		await this.accountDatabaseService.setItem(
			prop,
			BinaryProto,
			await this.fileService.getBytes(file, true),
			SecurityModels.public
		);
	}

	/** Sets the currently signed in user's avatar. */
	public async setAvatar (file: IFile) : Promise<void> {
		return this.setImage(file, 'avatar');
	}

	/** Sets the currently signed in user's cover image. */
	public async setCoverImage (file: IFile) : Promise<void> {
		return this.setImage(file, 'coverImage');
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly fileService: FileService
	) {
		super();
	}
}
