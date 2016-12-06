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
	public ui: any;

	/** @ignore */
	public tabLabels: string[]	= ui.coBranded ?
		[Strings.formattingHelp] :
		[Strings.formattingHelp, Strings.contactCyph]
	;

	constructor () { (async () => {
		while (!cyph || !ui) {
			await Util.sleep();
		}

		this.cyph	= cyph;
		this.ui		= ui;
	})(); }
}
