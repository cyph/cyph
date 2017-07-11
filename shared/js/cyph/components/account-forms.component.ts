import {Component, OnInit} from '@angular/core';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';

/**
 * Angular component for account forms UI.
 */
@Component({
	selector: 'cyph-account-forms',
	styleUrls: ['../../../css/components/account-home.scss'],
	templateUrl: '../../../templates/account-home.html'
})

export class AccountFormsComponent implements OnInit {
	ngOnInit() { }

	constructor (
		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
