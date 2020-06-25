import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../../base-provider';
import {
	AccountFileRecord,
	IAccountFileRecord,
	PatientInfo,
	RedoxPatient
} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {mergeObjects} from '../../util/objects';
import {prettyPrint} from '../../util/serialization';

/**
 * Angular component for account incoming patient info UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-incoming-patient-info',
	styleUrls: ['./account-incoming-patient-info.component.scss'],
	templateUrl: './account-incoming-patient-info.component.html'
})
export class AccountIncomingPatientInfoComponent extends BaseProvider
	implements OnInit {
	/** Downloads RedoxPatient object. */
	public readonly getRedoxPatient = memoize(
		async redoxPatient =>
			this.accountFilesService.downloadFile(
				redoxPatient,
				AccountFileRecord.RecordTypes.RedoxPatient
			).result
	);

	/** @see prettyPrint */
	public readonly prettyPrint = memoize(prettyPrint);

	/** @see trackByID */
	public readonly trackByID = trackByID;

	/** Accepts incoming patient data. */
	public async accept (redoxPatient: IAccountFileRecord) : Promise<void> {
		if (
			!(await this.dialogService.confirm({
				content: this.stringsService.incomingPatientInfo,
				title: this.stringsService.incomingPatientInfoTitle
			}))
		) {
			return;
		}

		const redoxPatientData = await this.getRedoxPatient(redoxPatient);

		this.accountDatabaseService
			.getAsyncValue('patientInfo', PatientInfo)
			.updateValue(async patientInfo => {
				patientInfo.redoxPatient = patientInfo.redoxPatient ?
					await mergeObjects(
						RedoxPatient,
						redoxPatientData,
						patientInfo.redoxPatient
					) :
					redoxPatientData;

				return patientInfo;
			});

		await this.accountFilesService.acceptIncomingFile(redoxPatient, false);
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
