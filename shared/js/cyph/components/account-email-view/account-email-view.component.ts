import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {AccountFileRecord, EmailMessage, IEmailMessage} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {StringsService} from '../../services/strings.service';
import {lockFunction} from '../../util/lock';
import {debugLogError} from '../../util/log';

/**
 * Angular component for account email view UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-email-view',
	styleUrls: ['./account-email-view.component.scss'],
	templateUrl: './account-email-view.component.html'
})
export class AccountEmailViewComponent extends BaseProvider implements OnInit {
	/** @see EmailViewComponent.email */
	public readonly email = new BehaviorSubject<IEmailMessage | undefined>(
		undefined
	);

	/** Preprocesses email contact. */
	private async preprocessEmailContact (
		contact: EmailMessage.IContact
	) : Promise<EmailMessage.IContact> {
		const publishedEmail: unknown = contact.username ?
			(
				await this.accountDatabaseService.callFunction('getEmailData', {
					username: contact.username
				})
			).email :
			undefined;

		contact.verified =
			typeof publishedEmail === 'string' &&
			contact.email === publishedEmail;

		return contact;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();

		const routeChangeLock = lockFunction();

		this.subscriptions.push(
			this.activatedRoute.params.subscribe(async params =>
				routeChangeLock(async () => {
					try {
						const id: unknown = params.id;
						if (typeof id !== 'string') {
							throw new Error('Missing email ID.');
						}

						this.accountService.interstitial.next(true);

						const emailRecord =
							await this.accountFilesService.getFile(
								id,
								AccountFileRecord.RecordTypes.Email
							);

						const email = await this.accountFilesService.getEmail(
							emailRecord
						);

						if (email.from.username !== emailRecord.owner) {
							throw new Error(
								`Email sender username mismatch: ${id}.`
							);
						}

						await Promise.all(
							[
								...(email.bcc || []),
								...(email.cc || []),
								...(email.to || []),
								email.from
							].map(async contact =>
								this.preprocessEmailContact(contact)
							)
						);

						this.email.next(email);
					}
					catch (err) {
						debugLogError(() => ({
							accountEmailViewComponentError: err
						}));
						await this.router.navigate(['404']);
					}
					finally {
						this.accountService.interstitial.next(false);
					}
				})
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
