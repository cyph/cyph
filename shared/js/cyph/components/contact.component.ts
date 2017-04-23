import {Component, Input} from '@angular/core';
import {Email} from '../email';
import {ConfigService} from '../services/config.service';
import {util} from '../util';


/**
 * Angular component for contact form UI.
 */
@Component({
	selector: 'cyph-contact',
	styleUrls: ['../../css/components/contact.css'],
	templateUrl: '../../templates/contact.html'
})
export class ContactComponent {
	/** @see IEmail */
	@Input() public email: Email;

	/** Sends email. */
	public send () : void {
		util.email(this.email);
	}

	constructor (
		/** @see ConfigService */
		public readonly configService: ConfigService
	) {}
}
