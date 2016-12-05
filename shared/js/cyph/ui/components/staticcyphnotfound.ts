import {Component} from '@angular/core';
import {Util} from '../../util';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-static-cyph-not-found',
	templateUrl: '../../../../templates/staticcyphnotfound.html'
})
export class StaticCyphNotFound {
	/** @ignore */
	public cyph: any;

	constructor () { (async () => {
		while (!cyph) {
			await Util.sleep();
		}

		this.cyph	= cyph;
	})(); }
}
