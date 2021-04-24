import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {lockFunction} from '../../util/lock';
import {observableAll} from '../../util/observable-all';

/**
 * Angular component for email confirmation UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-confirm-email',
	styleUrls: ['./account-confirm-email.component.scss'],
	templateUrl: './account-confirm-email.component.html'
})
export class AccountConfirmEmailComponent extends BaseProvider
	implements OnInit {
	/** @ignore */
	private readonly lock = lockFunction();

	/** Page state. */
	public readonly state = new BehaviorSubject<{
		approve?: boolean;
		error?: boolean;
		success?: boolean;
	}>({});

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.resolveUiReady();
		this.accountService.transitionEnd();
		this.accountService.interstitial.next(true);

		this.subscriptions.push(
			observableAll([
				this.activatedRoute.data,
				this.activatedRoute.params
			]).subscribe(
				async ([{approve}, {token}]: [
					{approve?: boolean},
					{token?: string}
				]) =>
					this.lock(async () => {
						approve = !!approve;

						this.accountService.interstitial.next(true);

						const success = await this.accountDatabaseService
							.callFunction('verifyEmailConfirm', {
								approve,
								token
							})
							.catch(() => undefined);

						if (typeof success !== 'boolean') {
							this.state.next({error: true});
							return;
						}

						this.state.next({approve, success});
						this.accountService.interstitial.next(false);
					})
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
