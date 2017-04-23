import {Component, OnInit} from '@angular/core';
import {UrlStateService} from '../cyph/services/url-state.service';
import {AppService} from './app.service';


/**
 * Angular component for the Cyph account screen.
 */
@Component({
	selector: 'cyph-account',
	styleUrls: ['../css/components/cyph.im/account.css'],
	templateUrl: '../templates/cyph.im/account.html'
})
export class AccountComponent implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		this.urlStateService.trigger();
	}

	constructor (
		/** @ignore */
		private readonly urlStateService: UrlStateService,

		/** @see AppService */
		public readonly appService: AppService
	) {}
}
