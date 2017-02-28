import {Component} from '@angular/core';
import {Email} from '../email';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for help UI.
 */
@Component({
	selector: 'cyph-help',
	styleUrls: ['../../css/components/help.css'],
	templateUrl: '../../../templates/help.html'
})
export class HelpComponent {
	/** @see Email */
	public readonly email: Email	= new Email('help');

	/** List of labels for tabs to display. */
	public readonly tabLabels: string[];

	constructor (
		stringsService: StringsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {
		this.tabLabels	= this.envService.coBranded ?
			[stringsService.formattingHelp] :
			[stringsService.formattingHelp, stringsService.contactCyph]
		;
	}
}
