import {Component, Input} from '@angular/core';
import {usernameMask} from '../account';
import * as util from '../util';


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
	@Input() public email: string				= '';

	/** Indicates whether form has been submitted. */
	public submitted: boolean					= false;

	/** Requested username. */
	@Input() public username: string			= '';

	/** Requested username alternate/backup. */
	@Input() public usernameAlternate: string	= '';

	/** @see usernameMask */
	public readonly usernameMask: any			= usernameMask;

	/** Submits form. */
	public submit () : void {
		util.email(
			'username-request@cyph.com',
			undefined,
			util.stringify({
				email: this.email,
				username: this.username,
				usernameAlternate: this.usernameAlternate
			}),
			this.email
		);

		this.submitted	= true;
	}

	constructor () {}
}
