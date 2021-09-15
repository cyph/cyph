import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {take} from 'rxjs/operators';
import {SecurityModels} from '../../account';
import {BaseProvider} from '../../base-provider';
import {EmailMessage, IEmailMessage, StringProto} from '../../proto';
import {AccountEmailService} from '../../services/account-email.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PotassiumService} from '../../services/crypto/potassium.service';
import {DialogService} from '../../services/dialog.service';
import {StringsService} from '../../services/strings.service';
import {downloadBlob} from '../../util/blobs';
import {filterUndefined} from '../../util/filter';
import {debugLog} from '../../util/log';
import {deserialize} from '../../util/serialization';

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
	/** URL to redirect to post-send. */
	private redirectURL?: string;

	/** Data to pass in to compose component. */
	public readonly emailComposeData = new BehaviorSubject<
		| {
				from?: EmailMessage.IContact;
				initialDraft?: IEmailMessage;
		  }
		| undefined
	>(undefined);

	/** @see EmailComposeComponent.preprocessRecipient */
	public readonly preprocessRecipient = memoize(
		async (contact: EmailMessage.IContact) => {
			const {email} = contact;

			const username =
				contact.username ||
				(await this.accountEmailService.getEmailData({email})).username;

			const name =
				(
					await (
						await this.accountUserLookupService.getUser(username)
					)?.accountUserProfile.getValue()
				)?.name || contact.name;

			return {email, name, username};
		}
	);

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
			email,
			{draftID, redirectURL}
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
				.catch(() => undefined),
			this.activatedRoute.params.pipe(take(1)).toPromise()
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

		this.redirectURL =
			typeof redirectURL === 'string' && redirectURL ?
				this.potassiumService.toString(
					this.potassiumService.fromBase64URL(redirectURL)
				) :
				undefined;

		this.emailComposeData.next({
			from: {
				email,
				name,
				username
			},
			initialDraft:
				typeof draftID === 'string' && draftID ?
					await deserialize(
						EmailMessage,
						await downloadBlob(draftID)
					) :
					undefined
		});
	}

	/** Sends email. */
	public async send (message: IEmailMessage) : Promise<void> {
		debugLog(() => ({accountEmailComposeComponentSend: message}));

		const id = await this.accountFilesService.upload(
			'',
			message,
			filterUndefined(message.to?.map(o => o.username) || [])
		).result;

		if (this.redirectURL) {
			location.href = this.redirectURL;
			return;
		}

		await this.router.navigate(['email', id]);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountEmailService: AccountEmailService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
