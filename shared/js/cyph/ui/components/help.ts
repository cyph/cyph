import {Component} from '@angular/core';
import {Email} from '../../email';
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
	/** List of labels for tabs to display. */
	public readonly tabLabels: string[]	= env.coBranded ?
		[strings.formattingHelp] :
		[strings.formattingHelp, strings.contactCyph]
	;

	/** @see Email */
	public readonly email: Email	= new Email('help');

	/** @see Env */
	public readonly env: Env		= env;

	constructor () {}
}
