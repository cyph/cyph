import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {SecurityModels} from '../../account';
import {BaseProvider} from '../../base-provider';
import {
	emailInput,
	getFormValue,
	input,
	newForm,
	newFormComponent,
	newFormContainer,
	text,
	textarea
} from '../../forms';
import {NewPGPKeyOptions} from '../../pgp';
import {AccountFileRecord, IPGPKey, StringProto} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PGPService} from '../../services/crypto/pgp.service';
import {DialogService} from '../../services/dialog.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {normalize, numberToString} from '../../util/formatting';
import {debugLogError} from '../../util/log';
import {getDateTimeString} from '../../util/time';

/**
 * Angular component for pgp UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-pgp',
	styleUrls: ['./account-pgp.component.scss'],
	templateUrl: './account-pgp.component.html'
})
export class AccountPGPComponent extends BaseProvider implements OnInit {
	/** Current draft of edited PGP key. */
	public readonly draft = new BehaviorSubject<{
		id?: string;
		name?: string;
	}>({});

	/** Edit mode. */
	public editMode = new BehaviorSubject<boolean>(false);

	/** @see getDateTimeString */
	public readonly getDateTimeString = getDateTimeString;

	/** Indicates whether speed dial is open. */
	public readonly isSpeedDialOpen = new BehaviorSubject<boolean>(false);

	/** @see NewPGPKeyOptions */
	public readonly newPGPKeyOptions = NewPGPKeyOptions;

	/** @see numberToString */
	public readonly numberToString = numberToString;

	/** @see AccountFileRecord.RecordTypes */
	public readonly recordType = AccountFileRecord.RecordTypes.PGPKey;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** Generates and uploads a new PGP key. */
	/* eslint-disable-next-line complexity */
	public async generate (
		newPGPKeyOptions: NewPGPKeyOptions = NewPGPKeyOptions.generate
	) : Promise<void> {
		const subtitle =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				this.stringsService.newPGPKeyGenerateText :
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				this.stringsService.newPGPKeyImportPublicKeyText :
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				this.stringsService.newPGPKeyImportPrivateKeyText :
				undefined;

		const title =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				this.stringsService.newPGPKeyGenerate :
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				this.stringsService.newPGPKeyImportPublicKey :
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				this.stringsService.newPGPKeyImportPrivateKey :
				undefined;

		if (!subtitle || !title) {
			return;
		}

		const generateForm = await this.dialogService.prompt({
			content: '',
			form: newForm([
				newFormComponent([
					newFormContainer([
						text({
							label: subtitle
						})
					])
				]),
				newFormComponent([
					...(newPGPKeyOptions === NewPGPKeyOptions.generate ?
						await Promise.all([
							this.accountDatabaseService.getItem(
								'email',
								StringProto,
								SecurityModels.unprotected
							),
							this.accountDatabaseService.currentUser.value?.user.accountUserProfile.getValue()
						]).then(async ([email, profile]) => [
							newFormContainer([input({
									label: this.stringsService
										.newPGPKeyNameInput,
									required: false,
									value: profile?.name
								})]),
							newFormContainer([emailInput({
									label: this.stringsService
										.newPGPKeyEmailInput,
									required: false,
									value: email
								})]),
							newFormContainer([input({
									label: this.stringsService
										.newPGPKeyCommentInput,
									required: false
								})])
						]) :
					newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
						[
							newFormContainer([textarea({
									label: this.stringsService
										.newPGPKeyImportPublicKeyInput,
									required: true
								})])
						] :
					newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
						[
							newFormContainer([textarea({
									label: this.stringsService
										.newPGPKeyImportPrivateKeyInput,
									required: true
								})])
						] :
						[])
				])
			]),
			title
		});

		const name =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				getFormValue(generateForm, 'string', 1, 0, 0) :
				undefined;

		const email =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				getFormValue(generateForm, 'string', 1, 1, 0) :
				undefined;

		const comment =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				getFormValue(generateForm, 'string', 1, 2, 0) :
				undefined;

		const publicKey =
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				getFormValue(generateForm, 'string', 1, 0, 0) :
				undefined;

		const privateKey =
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				getFormValue(generateForm, 'string', 1, 0, 0) :
				undefined;

		switch (newPGPKeyOptions) {
			case NewPGPKeyOptions.importPublicKey:
				if (!(typeof publicKey === 'string' && publicKey.length > 0)) {
					return;
				}
				break;

			case NewPGPKeyOptions.importPrivateKey:
				if (
					!(typeof privateKey === 'string' && privateKey.length > 0)
				) {
					return;
				}
		}

		const keyPair =
			publicKey !== undefined ?
				undefined :
				await this.pgpService.keyPair(
					privateKey !== undefined ?
						{privateKey} :
						{comment, email, name}
				);

		const {
			pgpMetadata,
			publicKeyBytes
		} = await this.pgpService.getPublicKeyMetadata(
			publicKey !== undefined ? publicKey : keyPair?.publicKey
		);

		const pgpKey: IPGPKey | undefined =
			keyPair !== undefined ?
				{
					pgpMetadata,
					keyPair
				} :
			publicKeyBytes !== undefined ?
				{
					pgpMetadata,
					publicKey: publicKeyBytes
				} :
				undefined;

		if (
			pgpKey === undefined ||
			!pgpMetadata.fingerprint ||
			!pgpMetadata.keyID
		) {
			return;
		}

		try {
			await this.accountFilesService.upload(
				pgpMetadata.userID ?
					`${pgpMetadata.userID} : ${pgpMetadata.keyID}` :
					pgpMetadata.keyID,
				pgpKey,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				normalize(pgpMetadata.fingerprint)
			).result;
		}
		catch (err) {
			debugLogError(() => ({pgpKeyUploadFailure: {err}}));

			await this.dialogService.alert({
				content: this.stringsService.newPGPKeyErrorText,
				title: this.stringsService.newPGPKeyErrorTitle
			});
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see PGPService */
		public readonly pgpService: PGPService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
