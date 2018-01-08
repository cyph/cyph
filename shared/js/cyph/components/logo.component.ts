import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for logo UI.
 */
@Component({
	selector: 'cyph-logo',
	styleUrls: ['../../../css/components/logo.scss'],
	templateUrl: '../../../templates/logo.html'
})
export class LogoComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
