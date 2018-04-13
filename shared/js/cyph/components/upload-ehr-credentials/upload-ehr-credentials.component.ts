import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {take} from 'rxjs/operators/take';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {EHRService} from '../../services/ehr.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for uploading EHR credentials.
 * Used by addredoxcredentials script; not intended for user interaction.
 */
@Component({
	selector: 'cyph-upload-ehr-credentials',
	styleUrls: ['./upload-ehr-credentials.component.scss'],
	templateUrl: './upload-ehr-credentials.component.html'
})
export class UploadEhrCredentialsComponent implements OnInit {
	/** Generated API key. */
	public readonly apiKey: BehaviorSubject<string>	= new BehaviorSubject('');

	/** Indicates whether operation is done. */
	public readonly done: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** Indicates whether operation failed. */
	public readonly error: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		try {
			this.accountService.transitionEnd();

			const {cyphAdminKey, redoxApiKey, redoxSecret, username}	= <{
				cyphAdminKey: string;
				redoxApiKey: string;
				redoxSecret: string;
				username: string;
			}>
				await this.activatedRoute.params.pipe(take(1)).toPromise()
			;

			const apiKey	= await this.ehrService.addCredentials(
				cyphAdminKey,
				redoxApiKey,
				redoxSecret,
				username
			);

			await this.accountFilesService.upload('', {apiKey, isMaster: true}, username).result;

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
		private readonly ehrService: EHRService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
