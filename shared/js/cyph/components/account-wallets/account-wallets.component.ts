import {Component} from '@angular/core';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account wallets UI.
 */
@Component({
	selector: 'cyph-account-wallets',
	styleUrls: ['./account-wallets.component.scss'],
	templateUrl: './account-wallets.component.html'
})
export class AccountWalletsComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
