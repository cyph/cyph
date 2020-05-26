import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {NewPGPKeyOptions} from '../../pgp';
import {
	getFormValue,
	input,
	newForm,
	newFormComponent,
	newFormContainer,
	numberInput,
	passwordInput,
	slideToggle,
	text
} from '../../forms';
import {
	Cryptocurrencies,
	Currencies,
	IAccountFileRecord,
	IPGPKey
} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {CryptocurrencyService} from '../../services/cryptocurrency.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {QRService} from '../../services/qr.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {numberToString} from '../../util/formatting';
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
	/** @see Cryptocurrencies */
	public readonly cryptocurrencies = Cryptocurrencies;

	/** @see Currencies */
	public readonly currencies = Currencies;

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

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** Transaction list columns. */
	public readonly transactionListColumns: string[] = [
		'amount',
		'senders',
		'wasSentByMe',
		'recipients',
		'timestamp'
	];

	/** Generates and uploads a new PGP key. */
	/* eslint-disable-next-line complexity */
	public async generate (
		newPGPKeyOptions: NewPGPKeyOptions = NewPGPKeyOptions.generate,
		cryptocurrency: Cryptocurrencies = Cryptocurrencies.BTC
	) : Promise<void> {
		const subtitle =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				this.stringsService.newPGPKeyGenerateText :
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				this.stringsService.newPGPKeyImportAddressText :
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				this.stringsService.newPGPKeyImportKeyText :
				undefined;

		const title =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				this.stringsService.newPGPKeyGenerate :
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				this.stringsService.newPGPKeyImportAddress :
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				this.stringsService.newPGPKeyImportKey :
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
					newFormContainer([
						input({
							label: this.stringsService.newPGPKeyNameInput,
							required: true,
							value: this.stringsService.newPGPKeyNameDefaultValue
						})
					]),
					...(newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
						[
							newFormContainer([input({
									label: this.stringsService
										.newPGPKeyImportAddressInput,
									required: true
								})])
						] :
					newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
						[
							newFormContainer([passwordInput({
									label: this.stringsService
										.newPGPKeyImportKeyInput,
									required: true
								}), slideToggle({
									label: this.stringsService
										.newPGPKeyUncompressed,
									noGrow: true,
									tooltip: this.stringsService
										.newPGPKeyUncompressedTooltip
								})])
						] :
						[])
				])
			]),
			title
		});

		const name = getFormValue(generateForm, 'string', 1, 0, 0);

		const address =
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				getFormValue(generateForm, 'string', 1, 1, 0) :
				undefined;

		const key =
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				getFormValue(generateForm, 'string', 1, 1, 0) :
				undefined;

		const uncompressedPublicKey =
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				getFormValue(generateForm, 'boolean', 1, 1, 1) :
				undefined;

		if (!name) {
			return;
		}

		switch (newPGPKeyOptions) {
			case NewPGPKeyOptions.importPublicKey:
				if (!address) {
					return;
				}
				break;

			case NewPGPKeyOptions.importPrivateKey:
				if (!(typeof key === 'string' && key.length > 0)) {
					return;
				}
		}

		try {
			await this.accountFilesService.upload(
				name,
				await this.cryptocurrencyService.generatePGPKey({
					address,
					cryptocurrency,
					key,
					uncompressedPublicKey
				})
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

	/** Saves draft edits. */
	public async saveEdits () : Promise<void> {
		if (
			this.editMode.value &&
			this.draft.value &&
			this.draft.value.id &&
			this.draft.value.name
		) {
			await this.accountFilesService.updateMetadata(this.draft.value.id, {
				name: this.draft.value.name
			});
		}

		this.setEditMode(false);
	}

	/** Sends money. */
	public async send (
		pgpKey: IPGPKey,
		recipient?: string,
		amount?: number
	) : Promise<void> {
		if (recipient === undefined || amount === undefined || isNaN(amount)) {
			this.accountFilesService.showSpinner.next(-1);

			let balance: number;
			try {
				balance = await this.cryptocurrencyService.getBalance(pgpKey);
			}
			finally {
				this.accountFilesService.showSpinner.next(undefined);
			}

			const step = 0.00000001;

			const max = Math.min(
				20999999.9769,
				Math.max(
					balance - this.cryptocurrencyService.transactionFee,
					this.cryptocurrencyService.minimumTransactionAmount
				)
			);

			const min = Math.min(
				max,
				this.cryptocurrencyService.minimumTransactionAmount
			);

			const sendForm = await this.dialogService.prompt({
				content: '',
				form: newForm([
					newFormComponent([
						newFormContainer([
							text({
								label: this.stringsService.setParameters(
									this.stringsService.bitcoinTransactionFee,
									{
										1: this.cryptocurrencyService.transactionFee.toString()
									}
								)
							})
						])
					]),
					newFormComponent([
						newFormContainer([
							input({
								label: this.stringsService
									.bitcoinRecipientLabel,
								value: recipient
							})
						])
					]),
					newFormComponent([
						newFormContainer([
							numberInput({
								label: this.stringsService.bitcoinAmountLabel,
								max,
								min,
								step,
								value: typeof amount === 'number' ? amount : min
							})
						])
					])
				]),
				title: this.stringsService.bitcoinSendTitle
			});

			recipient = getFormValue(sendForm, 'string', 1, 0, 0);
			amount = getFormValue(sendForm, 'number', 2, 0, 0);
		}

		if (recipient === undefined || amount === undefined || isNaN(amount)) {
			return;
		}

		if (
			!(await this.dialogService.confirm({
				content: this.stringsService.setParameters(
					this.stringsService.bitcoinConfirmationPrompt,
					{
						1: amount.toFixed(8),
						2: recipient
					}
				),
				title: this.stringsService.bitcoinSendTitle
			}))
		) {
			return;
		}

		this.accountFilesService.showSpinner.next(-1);

		try {
			await this.cryptocurrencyService.send(pgpKey, recipient, amount);

			return this.dialogService.alert({
				content: `${
					this.stringsService.bitcoinSuccessText
				} ${amount.toFixed(8)} ${this.stringsService.bitcoinShort}.`,
				title: this.stringsService.bitcoinSuccessTitle
			});
		}
		catch (err) {
			return this.dialogService.alert({
				content: `${
					this.stringsService.bitcoinErrorText
				} ${amount.toFixed(8)} ${this.stringsService.bitcoinShort}${
					err instanceof Error ? `: ${err.message}` : '.'
				}`,
				title: this.stringsService.bitcoinErrorTitle
			});
		}
		finally {
			this.accountFilesService.showSpinner.next(undefined);
		}
	}

	/** Sets edit mode. */
	public setEditMode (editMode: boolean | IAccountFileRecord) : void {
		if (typeof editMode === 'object') {
			this.draft.next({id: editMode.id, name: editMode.name});
			this.editMode.next(true);
		}
		else {
			this.draft.next({});
			this.editMode.next(editMode);
		}
	}

	/** Updates draft. */
	public updateDraft (draft: {id?: string; name?: string}) : void {
		this.draft.next({...this.draft.value, ...draft});
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

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see CryptocurrencyService */
		public readonly cryptocurrencyService: CryptocurrencyService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see QRService */
		public readonly qrService: QRService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
