import {Injectable} from '@angular/core';
import {map} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {IFile} from '../ifile';
import {BinaryProto, CyphPlan, CyphPlans} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {AccountDatabaseService} from './crypto/account-database.service';
import {FileService} from './file.service';


/**
 * Account settings service.
 */
@Injectable()
export class AccountSettingsService extends BaseProvider {
	/** User's plan / premium status. */
	public readonly plan	= toBehaviorSubject(
		this.accountDatabaseService.watch(
			'plan',
			CyphPlan,
			SecurityModels.unprotected,
			undefined,
			undefined,
			this.subscriptions
		).pipe(map(o =>
			o.value.plan
		)),
		CyphPlans.Free,
		this.subscriptions
	);

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
