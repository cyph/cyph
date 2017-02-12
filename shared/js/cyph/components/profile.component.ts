import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Angular component for profile UI.
 */
@Component({
	selector: 'cyph-profile',
	styleUrls: ['../../css/components/profile.css'],
	templateUrl: '../../../templates/profile.html'
})
export class ProfileComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
