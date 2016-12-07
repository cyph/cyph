import {Component, Input} from '@angular/core';
import {Util} from '../../util';


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
	public cyph: any;

	/** @ignore */
	public ui: any;

	/** @ignore */
	public send () : void {
		Util.email(this.self);
		this.self.sent	= true;
	}

	constructor () { (async () => {
		while (!cyph || !ui) {
			await Util.sleep();
		}

		this.cyph	= cyph;
		this.ui		= ui;
	})(); }
}
