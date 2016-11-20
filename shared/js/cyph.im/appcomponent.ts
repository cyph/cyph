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
	public Cyph: any;
	public ui: any;

	constructor () { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep();
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];
	})(); }
}
