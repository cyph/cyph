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
	/** @ignore */
	@Input() public self: {
		fromEmail: string;
		fromName: string;
		message: string;
		to: string;
		sent: boolean;
		subject: string;
	};

	/** @ignore */
	public config: Config	= config;

	/** @ignore */
	public send () : void {
		util.email(this.self);
		this.self.sent	= true;
	}

	constructor () {}
}
