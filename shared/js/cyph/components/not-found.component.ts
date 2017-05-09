import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-not-found',
	styleUrls: ['../../css/components/not-found.scss'],
	templateUrl: '../../templates/not-found.html'
})
export class NotFoundComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
