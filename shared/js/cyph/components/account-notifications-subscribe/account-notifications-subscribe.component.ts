import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {combineLatest, Observable} from 'rxjs';
import {mergeMap} from 'rxjs/operators';
import {SecurityModels} from '../../account/enums';
import {IAsyncValue} from '../../iasync-value';
import {StringProto} from '../../proto';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account notifications subscribe UI.
 */
@Component({
	selector: 'cyph-account-notifications-subscribe',
	styleUrls: ['./account-notifications-subscribe.component.scss'],
	templateUrl: './account-notifications-subscribe.component.html'
})
export class AccountNotificationsSubscribeComponent {
	/** @ignore */
	private readonly email: IAsyncValue<string>	= this.accountDatabaseService.getAsyncValue(
		'email',
		StringProto,
		SecurityModels.unprotected
	);

	/** Subscription status. */
	public readonly status: Observable<{
		email?: string;
		subscribed?: boolean;
		unsubscribed?: boolean;
	}>	= combineLatest(
		this.activatedRoute.data,
		this.activatedRoute.params
	).pipe(mergeMap(async ([{unsubscribe}, {email}]: [
		{unsubscribe?: boolean},
		{email?: string}
	]) => {
		if (unsubscribe) {
			const oldEmail	= await this.email.getValue().catch(() => '');
			await this.email.setValue('');
			return {email: oldEmail, unsubscribed: true};
		}
		else if (email) {
			await this.email.setValue(email);
			return {email, subscribed: true};
		}
		else {
			return {email: await this.email.getValue().catch(() => '')};
		}
	}));

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
