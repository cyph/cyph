import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';
import {util} from '../util';


/**
 * Angular component for account login UI.
 */
@Component({
	selector: 'cyph-account-login',
	styleUrls: ['../../../css/components/account-login.scss'],
	templateUrl: '../../../templates/account-login.html'
})
export class AccountLoginComponent {
	/** Indicates whether login attempt is in progress. */
	public checking: boolean	= false;

	/** Indicates whether the last login attempt has failed. */
	public error: boolean		= false;

	/** Password to be used for login attempt. */
	public password: string		= '';

	/** Username to be used for login attempt. */
	public username: string		= '';

	/** Initiates login attempt. */
	public async submit () : Promise<void> {
		/* TODO: stop blatantly lying to people */

		this.checking	= true;
		this.error		= false;

		await util.sleep(util.random(4000, 1500));

		this.checking	= false;
		this.error		= true;
	}

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
