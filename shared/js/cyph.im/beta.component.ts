import {Component, Input, OnInit} from '@angular/core';
import {Strings, strings} from '../cyph/strings';
import {urlState} from '../cyph/url-state';
import {util} from '../cyph/util';
import {BetaStates} from './enums';


/**
 * Angular component for the Cyph beta screen.
 */
@Component({
	selector: 'cyph-beta',
	templateUrl: '../../templates/cyph.im/beta.html'
})
export class BetaComponent implements OnInit {
	/** @ignore */
	@Input() public betaState: BetaStates;

	/** @ignore */
	public checking: boolean	= false;

	/** @ignore */
	public error: boolean		= false;

	/** @ignore */
	public password: string		= '';

	/** @ignore */
	public username: string		= '';

	/** @ignore */
	public betaStates: typeof BetaStates	= BetaStates;

	/** @ignore */
	public strings: Strings					= strings;

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
		urlState.trigger();
	}

	constructor () {}
}
