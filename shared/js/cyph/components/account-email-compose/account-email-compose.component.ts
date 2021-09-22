import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {take} from 'rxjs/operators';
import {SecurityModels} from '../../account';
import {BaseProvider} from '../../base-provider';
import {
	BinaryProto,
	EmailMessage,
	EmailMessageExternal,
	IEmailMessage,
	IEmailMessageExternal,
	StringProto
} from '../../proto';
import {AccountEmailService} from '../../services/account-email.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PotassiumService} from '../../services/crypto/potassium.service';
import {DialogService} from '../../services/dialog.service';
import {StringsService} from '../../services/strings.service';
import {deleteBlob, downloadBlob, uploadBlob} from '../../util/blobs';
import {filterUndefined} from '../../util/filter';
import {debugLog} from '../../util/log';
import {deserialize, serialize} from '../../util/serialization';

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
				initialDraftID?: string;
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
		const {draftID, redirectURL} = await this.activatedRoute.params
			.pipe(take(1))
			.toPromise();

		const initialDraftID =
			typeof draftID === 'string' && draftID ? draftID : undefined;

		this.redirectURL =
			typeof redirectURL === 'string' && redirectURL ?
				this.potassiumService.toString(
					this.potassiumService.fromBase64URL(redirectURL)
				) :
				undefined;

		if (!this.accountDatabaseService.currentUser.value) {
			if (initialDraftID) {
				this.accountAuthService.registrationMetadata.next({
					initialEmailCompose: {
						draftID: initialDraftID,
						fromEmail: (
							await deserialize(
								EmailMessage,
								await downloadBlob(initialDraftID)
							)
						).from.email,
						pending: true,
						redirectURL: this.redirectURL
					}
				});
			}

			await this.router.navigate(['register']);
			return;
		}

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

		this.emailComposeData.next({
			from: {
				email,
				name,
				username
			},
			initialDraft: initialDraftID ?
				await deserialize(
					EmailMessage,
					await downloadBlob(initialDraftID)
				) :
				undefined,
			initialDraftID
		});
	}

	/** Sends email. */
	public async send (message: IEmailMessage) : Promise<void> {
		debugLog(() => ({accountEmailComposeComponentSend: message}));

		const to = filterUndefined(
			message.to?.map(o =>
				o.username ?
					<EmailMessage.IContact & {username: string}> o :
					undefined
			) || []
		);

		const id = await this.accountFilesService.upload(
			'',
			message,
			to.map(o => o.username),
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			!!this.redirectURL
		).result;

		if (this.emailComposeData.value?.initialDraftID) {
			await deleteBlob(this.emailComposeData.value.initialDraftID);
		}

		if (!this.redirectURL) {
			await this.router.navigate(['email', id]);
			return;
		}

		const cyphertext = await this.accountDatabaseService.getItem(
			`files/${id}`,
			BinaryProto,
			SecurityModels.unprotected
		);

		const emailViewURL = `${locationData.origin}/email/${id}`;

		const emailMessageExternalID = await uploadBlob(
			await serialize<IEmailMessageExternal>(EmailMessageExternal, {
				attachments: [
					{
						data: cyphertext,
						mediaType: 'application/octet-stream',
						name: 'encrypted-content.cyph'
					}
				],
				html: emailViewURL,
				to: to.map(o => ({email: o.email, name: o.name}))
			})
		);

		location.href = `${
			this.redirectURL.split('#')[0] || ''
		}#cyphEmailID=${emailMessageExternalID}`;
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

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
