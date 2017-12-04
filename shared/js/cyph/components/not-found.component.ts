import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-not-found',
	styleUrls: ['../../../css/components/not-found.scss'],
	templateUrl: '../../../templates/not-found.html'
})
export class NotFoundComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
