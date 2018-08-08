import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {NewWalletOptions} from '../../cryptocurrency';
import {MaybePromise} from '../../maybe-promise-type';
import {Cryptocurrencies, Currencies, IAccountFileRecord} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {CryptocurrencyService} from '../../services/cryptocurrency.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {QRService} from '../../services/qr.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {numberToString} from '../../util/formatting';
import {getDateTimeString} from '../../util/time';


/**
 * Angular component for wallets UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-wallets',
	styleUrls: ['./account-wallets.component.scss'],
	templateUrl: './account-wallets.component.html'
})
export class AccountWalletsComponent extends BaseProvider implements OnInit {
	/** @see Cryptocurrencies */
	public readonly cryptocurrencies					= Cryptocurrencies;

	/** @see Currencies */
	public readonly currencies							= Currencies;

	/** Current draft of edited wallet. */
	public readonly draft								= new BehaviorSubject<{
		id?: string;
		name?: string;
	}>(
		{}
	);

	/** Edit mode. */
	public editMode										= new BehaviorSubject<boolean>(false);

	/** @see getDateTimeString */
	public readonly getDateTimeString					= getDateTimeString;

	/** Indicates whether speed dial is open. */
	public readonly isSpeedDialOpen						= new BehaviorSubject<boolean>(false);

	/** @see NewWalletOptions */
	public readonly newWalletOptions					= NewWalletOptions;

	/** @see numberToString */
	public readonly numberToString						= numberToString;

	/** @see trackByID */
	public readonly trackByID							= trackByID;

	/** Transaction list columns. */
	public readonly transactionListColumns: string[]	= [
		'amount',
		'senders',
		'wasSentByMe',
		'recipients',
		'timestamp'
	];

	public newWalletName								= new BehaviorSubject<string>('');

	/** Generates and uploads a new wallet. */
	public async generate (
		newWalletOptions: NewWalletOptions = NewWalletOptions.generate,
		cryptocurrency: Cryptocurrencies = Cryptocurrencies.BTC,
		customName?: MaybePromise<string|undefined>
	) : Promise<void> {
		let address: string|undefined;
		let key: string|undefined;
		let name: string|undefined;

		switch (newWalletOptions) {
			case NewWalletOptions.generate:
				name	= (await customName) || await this.dialogService.prompt({
					content: this.stringsService.newWalletGenerateText,
					placeholder: this.stringsService.newWalletNameInput,
					title: this.stringsService.newWalletGenerate
				});

				if (!name) {
					return;
				}

				break;

			case NewWalletOptions.importAddress:
				address	= await this.dialogService.prompt({
					content: this.stringsService.newWalletImportAddressText,
					placeholder: this.stringsService.newWalletImportAddressInput,
					title: this.stringsService.newWalletImportAddress
				});

				if (!address) {
					return;
				}

				break;

			case NewWalletOptions.importKey:
				key	= await this.dialogService.prompt({
					content: this.stringsService.newWalletImportKeyText,
					placeholder: this.stringsService.newWalletImportKeyInput,
					title: this.stringsService.newWalletImportKey
				});

				if (!key) {
					return;
				}

				break;

			default:
				return;
		}

		if (!name) {
			name	= (await customName) || await this.dialogService.prompt({
				content: this.stringsService.newWalletNameText,
				placeholder: this.stringsService.newWalletNameInput,
				title: this.stringsService.newWalletName
			});

			if (!name) {
				return;
			}
		}

		await this.accountFilesService.upload(
			name,
			await this.cryptocurrencyService.generateWallet({address, cryptocurrency, key})
		);
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
			await this.accountFilesService.updateMetadata(
				this.draft.value.id,
				{name: this.draft.value.name}
			);
		}

		this.setEditMode(false);
	}

	/** Sets edit mode. */
	public setEditMode (editMode: boolean|IAccountFileRecord) : void {
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

		/** @see CryptocurrencyService */
		public readonly cryptocurrencyService: CryptocurrencyService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService,

		/** @see QRService */
		public readonly qrService: QRService
	) {
		super();
	}
}
