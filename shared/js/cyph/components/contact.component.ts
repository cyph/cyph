import {Component, Input} from '@angular/core';
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
	/** Sender email address. */
	@Input() public fromEmail: string	= '';

	/** Sender name. */
	@Input() public fromName: string	= '';

	/** Email body. */
	@Input() public message: string		= '';

	/** Indicates whether email has been sent. */
	public sent: boolean				= false;

	/** Email subject. */
	@Input() public subject: string		= '';

	/** Recipient @cyph.com email address ("@cyph.com" may be omitted). */
	@Input() public to: string			= '';

	/** Sends email. */
	public send () : void {
		util.email(
			this.to,
			this.subject,
			this.message,
			this.fromEmail,
			this.fromName
		);

		this.sent	= true;
	}

	constructor (
		/** @see ConfigService */
		public readonly configService: ConfigService
	) {}
}
