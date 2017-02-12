import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Angular component for contacts UI.
 */
@Component({
	selector: 'cyph-contacts',
	styleUrls: ['../../css/components/contacts.css'],
	templateUrl: '../../../templates/contacts.html'
})
export class ContactsComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
