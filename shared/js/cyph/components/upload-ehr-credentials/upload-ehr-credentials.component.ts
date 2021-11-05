import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, firstValueFrom} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {EHRIntegrationService} from '../../services/ehr-integration.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for uploading EHR credentials.
 * Used by addredoxcredentials script; not intended for user interaction.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-upload-ehr-credentials',
	styleUrls: ['./upload-ehr-credentials.component.scss'],
	templateUrl: './upload-ehr-credentials.component.html'
})
export class UploadEhrCredentialsComponent
	extends BaseProvider
	implements OnInit
{
	/** Generated API key. */
	public readonly apiKey: BehaviorSubject<string> = new BehaviorSubject('');

	/** Indicates whether operation is done. */
	public readonly done: BehaviorSubject<boolean> =
		new BehaviorSubject<boolean>(false);

	/** Indicates whether operation failed. */
	public readonly error: BehaviorSubject<boolean> =
		new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		try {
			this.accountService.resolveUiReady();
			this.accountService.transitionEnd();

			const {cyphAdminKey, redoxApiKey, redoxSecret, username} = <
				{
					cyphAdminKey: string;
					redoxApiKey: string;
					redoxSecret: string;
					username: string;
				}
			> await firstValueFrom(this.activatedRoute.params);

			const apiKey = await this.ehrIntegrationService.addCredentials(
				cyphAdminKey,
				redoxApiKey,
				redoxSecret,
				username
			);

			await this.accountFilesService.upload(
				'',
				{apiKey, isMaster: true},
				username
			).result;

			this.apiKey.next(apiKey);
			this.done.next(true);
		}
		catch (err) {
			this.error.next(true);
			throw err;
		}
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly ehrIntegrationService: EHRIntegrationService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
