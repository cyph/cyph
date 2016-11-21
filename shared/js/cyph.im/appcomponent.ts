import {Component} from '@angular/core';
import {Templates} from '../cyph/ui/templates';
import {Util} from '../cyph/util';


/**
 * Angular component for Cyph UI.
 */
@Component({
	selector: 'cyph-app',
	template: Templates.app
})
export class AppComponent {
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
