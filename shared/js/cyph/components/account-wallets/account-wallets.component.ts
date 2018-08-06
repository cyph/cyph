import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {BaseProvider} from '../../base-provider';
import {NewWalletOptions} from '../../cryptocurrency';
import {Cryptocurrencies, Currencies} from '../../proto';
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

	/** Generates and uploads a new wallet. */
	public async generate (
		newWalletOptions: NewWalletOptions = NewWalletOptions.generate,
		cryptocurrency: Cryptocurrencies = Cryptocurrencies.BTC,
		name: string|Promise<string> = xkcdPassphrase.generateWithWordCount(4)
	) : Promise<void> {
		let address: string|undefined;
		let key: string|undefined;

		switch (newWalletOptions) {
			case NewWalletOptions.generate:
				if (!(await this.dialogService.confirm({
					content: this.stringsService.newWalletGenerateText,
					title: this.stringsService.newWalletGenerate
				}))) {
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

		await this.accountFilesService.upload(
			await name,
			await this.cryptocurrencyService.generateWallet({address, cryptocurrency, key})
		);
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
