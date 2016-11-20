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
		while (!self['cyph'] || !self['ui']) {
			await Util.sleep();
		}

		this.cyph	= self['cyph'];
		this.ui		= self['ui'];
	})(); }
}
