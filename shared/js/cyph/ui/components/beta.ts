import {Component} from '@angular/core';
import {Util} from '../../util';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-beta',
	templateUrl: '../../../../templates/beta.html'
})
export class Beta {
	/** @ignore */
	public cyph: any;

	/** @ignore */
	public ui: any;

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

		await Util.sleep(Util.random(4000, 1500));

		this.checking	= false;
		this.error		= true;
	}

	constructor () { (async () => {
		while (!cyph || !ui) {
			await Util.sleep();
		}

		this.cyph	= cyph;
		this.ui		= ui;
	})(); }
}
