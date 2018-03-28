import {Component, OnInit} from '@angular/core';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {Cryptocurrencies} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {CryptocurrencyService} from '../../services/cryptocurrency.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';


/**
 * Angular component for wallets UI.
 */
@Component({
	selector: 'cyph-account-wallets',
	styleUrls: ['./account-wallets.component.scss'],
	templateUrl: './account-wallets.component.html'
})
export class AccountWalletsComponent implements OnInit {
	/** @see trackByID */
	public readonly trackByID: typeof trackByID	= trackByID;

	/** Generates and uploads a new wallet. */
	public async generate (
		cryptocurrency: Cryptocurrencies = Cryptocurrencies.BTC
	) : Promise<void> {
		await this.accountFilesService.upload(
			await xkcdPassphrase.generateWithWordCount(4),
			await this.cryptocurrencyService.generateWallet(cryptocurrency)
		);
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
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
		public readonly stringsService: StringsService
	) {}
}
