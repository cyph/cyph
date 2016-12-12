import {Component, Input} from '@angular/core';
import {Config, config} from '../../config';
import {Email} from '../../email';
import {util} from '../../util';


/**
 * Angular component for contact form UI.
 */
@Component({
	selector: 'cyph-contact',
	templateUrl: '../../../../templates/contact.html'
})
export class Contact {
	/** @see IEmail */
	@Input() public email: Email;

	/** @see Config */
	public readonly config: Config	= config;

	/** Sends email. */
	public send () : void {
		util.email(this.email);
	}

	constructor () {}
}
