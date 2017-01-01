import {Component} from '@angular/core';
import {Email} from '../../email';
import {strings} from '../../strings';
import {EnvService} from '../services/env.service';


/**
 * Angular component for help UI.
 */
@Component({
	selector: 'cyph-help',
	templateUrl: '../../../../templates/help.html'
})
export class HelpComponent {
	/** List of labels for tabs to display. */
	public readonly tabLabels: string[];

	/** @see Email */
	public readonly email: Email	= new Email('help');

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService
	) {
		this.tabLabels	= this.envService.coBranded ?
			[strings.formattingHelp] :
			[strings.formattingHelp, strings.contactCyph]
		;
	}
}
