import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for search bar UI.
 */
@Component({
	selector: 'cyph-search-bar',
	styleUrls: ['../../../css/components/search-bar.scss'],
	templateUrl: '../../../templates/search-bar.html'
})
export class SearchBarComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
