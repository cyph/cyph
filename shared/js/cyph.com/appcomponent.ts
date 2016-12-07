import {Component} from '@angular/core';
import {Util} from '../cyph/util';
import {UI} from './ui';


/**
 * Angular component for Cyph home page.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.com.html'
})
export class AppComponent {
	/** @ignore */
	public cyph: any;

	/** @ignore */
	public ui: UI;

	constructor () { (async () => {
		while (!cyph || !ui) {
			await Util.sleep();
		}

		this.cyph	= cyph;
		this.ui		= ui;
	})(); }
}
