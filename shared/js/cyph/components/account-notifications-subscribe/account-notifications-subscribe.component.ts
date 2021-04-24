import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {mergeMap} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {observableAll} from '../../util/observable-all';

/**
 * Angular component for account notifications subscribe UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-notifications-subscribe',
	styleUrls: ['./account-notifications-subscribe.component.scss'],
	templateUrl: './account-notifications-subscribe.component.html'
})
export class AccountNotificationsSubscribeComponent extends BaseProvider
	implements OnInit {
	/** Subscription status. */
	public readonly status: Observable<{
		email?: string;
		subscribed?: boolean;
		unsubscribed?: boolean;
	}> = observableAll([
		this.activatedRoute.data,
		this.activatedRoute.params
	]).pipe(
		mergeMap(
			async ([{unsubscribe}, {email}]: [
				{unsubscribe?: boolean},
				{email?: string}
			]) => {
				if (unsubscribe) {
					const oldEmail = await this.accountSettingsService.email
						.getValue()
						.catch(() => '');
					await this.accountSettingsService.email.setValue('');
					return {email: oldEmail, unsubscribed: true};
				}

				if (email) {
					await this.accountSettingsService.email.setValue(email);
					return {email, subscribed: true};
				}

				return {
					email: await this.accountSettingsService.email
						.getValue()
						.catch(() => '')
				};
			}
		)
	);

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.resolveUiReady();
		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountSettingsService: AccountSettingsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
