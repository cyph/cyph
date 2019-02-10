import {Injectable} from '@angular/core';
import {map} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {BooleanProto} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';


/**
 * Angular service for managing Accounts invites.
 */
@Injectable()
export class AccountInviteService extends BaseProvider {
	/** @ignore */
	private readonly codes	= this.accountDatabaseService.getAsyncMap(
		'inviteCodes',
		BooleanProto,
		SecurityModels.unprotected
	);

	/** Number of available invites. */
	public readonly count	= toBehaviorSubject(
		this.codes.watchKeys().pipe(map(arr => arr.length)),
		0
	);

	/** Sends an invite link. */
	public async send (email: string, name?: string) : Promise<void> {
		await this.databaseService.callFunction('sendInvite', {email, name});
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {
		super();
	}
}
