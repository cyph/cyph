import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';
import {util} from '../util';


/**
 * Angular component for account login UI.
 */
@Component({
	selector: 'cyph-account-login',
	styleUrls: ['../../css/components/account-login.css'],
	templateUrl: '../../templates/account-login.html'
})
export class AccountLoginComponent {
	/** @ignore */
	public checking: boolean	= false;

	/** @ignore */
	public error: boolean		= false;

	/** @ignore */
	public password: string		= '';

	/** @ignore */
	public username: string		= '';

	/** @ignore */
	public async onSubmit () : Promise<void> {
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
