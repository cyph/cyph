import {Component, Input} from '@angular/core';
import {util} from '../util';


/**
 * Angular component for claim username UI.
 */
@Component({
	selector: 'cyph-claim-username',
	styleUrls: ['../../../css/components/claim-username.scss'],
	templateUrl: '../../../templates/claim-username.html'
})
export class ClaimUsernameComponent {
	/** User's email address. */
	@Input() public email: string		= '';

	/** Indicates whether form has been submitted. */
	public submitted: boolean			= false;

	/** Requested username. */
	@Input() public username: string	= '';

	/** Username text mask. */
	public readonly usernameMask: any	= {
		guide: false,
		mask: new Array(50).fill(/[0-9A-Za-z_]/)
	};

	/** Submits form. */
	public submit () : void {
		util.email('username-request@cyph.com', undefined, this.username, this.email);
		this.submitted	= true;
	}

	constructor () {}
}
