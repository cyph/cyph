import {Component} from '@angular/core';
import {Util} from '../../util';


/**
 * Angular component for help UI.
 */
@Component({
	selector: 'cyph-help',
	templateUrl: '../../../../templates/help.html'
})
export class Help {
	/** @ignore */
	public cyph: any;

	/** @ignore */
	public ui: any;

	constructor () { (async () => {
		while (!cyph || !ui) {
			await Util.sleep();
		}

		this.cyph	= cyph;
		this.ui		= ui;
	})(); }
}
