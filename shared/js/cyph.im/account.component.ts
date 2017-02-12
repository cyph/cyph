import {Component, OnInit} from '@angular/core';
import {StringsService} from '../cyph/services/strings.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {util} from '../cyph/util';
import {AppService} from './app.service';


/**
 * Angular component for the Cyph account screen.
 */
@Component({
	selector: 'cyph-account',
	styleUrls: ['../css/components/cyph.im/account.css'],
	templateUrl: '../../templates/cyph.im/account.html'
})
export class AccountComponent implements OnInit {
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

	/** @inheritDoc */
	public ngOnInit () : void {
		this.urlStateService.trigger();
	}

	constructor (
		/** @ignore */
		private readonly urlStateService: UrlStateService,

		/** @see AppService */
		public readonly appService: AppService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
