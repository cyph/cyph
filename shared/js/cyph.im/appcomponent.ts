import {Templates} from '../cyph/ui/templates';
import {Util} from '../cyph/util';
import {Component} from '@angular/core';


/**
 * Angular component for Cyph UI.
 */
@Component({
	selector: 'cyph-app',
	template: Templates.app
})
export class AppComponent {
	private Cyph: any;
	private ui: any;

	constructor () { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];
	})(); }
}
