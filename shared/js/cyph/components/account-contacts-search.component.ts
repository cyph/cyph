import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account contacts search UI.
 */
@Component({
	selector: 'cyph-account-contacts-search',
	styleUrls: ['../../../css/components/account-contacts-search.scss'],
	templateUrl: '../../../templates/account-contacts-search.html'
})
export class AccountContactsSearchComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
