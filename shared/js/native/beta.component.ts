import {Component, OnInit} from '@angular/core';
import {AppService} from './app.service';
import {StringsService} from './js/cyph/services/strings.service';
import {util} from './js/cyph/util';


/**
 * Angular component for the Cyph beta screen.
 */
@Component({
	selector: 'cyph-beta',
	templateUrl: './templates/app/beta.html'
})
export class BetaComponent implements OnInit {
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
	public ngOnInit () : void {}

	constructor (
		/** @see AppService */
		public readonly appService: AppService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
