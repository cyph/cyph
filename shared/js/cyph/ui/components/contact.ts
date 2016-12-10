import {Component, Input} from '@angular/core';
import {Config, config} from '../../config';
import {util} from '../../util';


/**
 * Angular component for contact form UI.
 */
@Component({
	selector: 'cyph-contact',
	templateUrl: '../../../../templates/contact.html'
})
export class Contact {
	/** Contact form state. */
	@Input() public self: {
		fromEmail: string;
		fromName: string;
		message: string;
		to: string;
		sent: boolean;
		subject: string;
	};

	/** @see Config */
	public readonly config: Config	= config;

	/** Sends email. */
	public send () : void {
		util.email(this.self);
		this.self.sent	= true;
	}

	constructor () {}
}
