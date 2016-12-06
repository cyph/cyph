import {Component} from '@angular/core';
import {Strings} from '../../strings';
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
	public tabLabels: string[]	= [
		Strings.formattingHelp,
		Strings.contactCyph
	];

	constructor () { (async () => {
		while (!cyph || !ui) {
			await Util.sleep();
		}

		if (ui.coBranded) {
			this.tabLabels.pop();
		}

		this.cyph	= cyph;
	})(); }
}
