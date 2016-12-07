import {Component} from '@angular/core';
import {Util} from '../../util';


/**
 * Angular component for static footer content.
 */
@Component({
	selector: 'cyph-static-footer',
	templateUrl: '../../../../templates/staticfooter.html'
})
export class StaticFooter {
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
