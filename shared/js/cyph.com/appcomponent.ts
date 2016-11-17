import {Templates} from '../cyph/ui/templates';
import {Util} from '../cyph/util';
import {Component} from '@angular/core';


/**
 * Angular component for Cyph home page.
 */
@Component({
	selector: 'cyph-app',
	template: `<cyph-home></cyph-home>`
})
export class AppComponent {
	public Cyph: any;
	public ui: any;

	constructor () { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];
	})(); }
}
