import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {SecurityModels} from '../../account';
import {BaseProvider} from '../../base-provider';
import {EmailMessage, IEmailMessage, StringProto} from '../../proto';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {StringsService} from '../../services/strings.service';
import {debugLog} from '../../util/log';

/**
 * Angular component for account email compose UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-email-compose',
	styleUrls: ['./account-email-compose.component.scss'],
	templateUrl: './account-email-compose.component.html'
})
export class AccountEmailComposeComponent
	extends BaseProvider
	implements OnInit
{
	/** @see EmailComposeComponent.from */
	public readonly senderData = new BehaviorSubject<
		EmailMessage.IContact | undefined
	>(undefined);

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.interstitial.next(true);
		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();

		const currentUserPromise = this.accountDatabaseService.getCurrentUser();

		const [
			{
				user: {username}
			},
			{name},
			email
		] = await Promise.all([
			currentUserPromise,
			currentUserPromise.then(async o =>
				o.user.accountUserProfile.getValue()
			),
			this.accountDatabaseService
				.getItem(
					'emailVerified',
					StringProto,
					SecurityModels.unprotected
				)
				.catch(() => undefined)
		]);

		this.accountService.interstitial.next(false);

		if (!email) {
			await this.router.navigate(['settings']);
			await this.dialogService.toast(
				this.stringsService.emailVerifiedRequiredError,
				-1,
				this.stringsService.ok
			);
			return;
		}

		this.senderData.next({
			email,
			name,
			username
		});
	}

	/** Sends email. */
	public async send (message: IEmailMessage) : Promise<void> {
		/* TODO */
		debugLog(() => ({accountEmailComposeComponentSendTest: message}));
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
