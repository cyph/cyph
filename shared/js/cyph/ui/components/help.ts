import {Component} from '@angular/core';
import {Env, env} from '../../env';
import {strings} from '../../strings';


/**
 * Angular component for help UI.
 */
@Component({
	selector: 'cyph-help',
	templateUrl: '../../../../templates/help.html'
})
export class Help {
	/** @ignore */
	public tabLabels: string[]	= coBranded ?
		[strings.formattingHelp] :
		[strings.formattingHelp, strings.contactCyph]
	;

	/** @ignore */
	public env: Env	= env;

	constructor () {}
}
