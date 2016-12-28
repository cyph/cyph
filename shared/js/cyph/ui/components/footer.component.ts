import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';


/**
 * Angular component for static footer content.
 */
@Component({
	selector: 'cyph-footer',
	templateUrl: '../../../../templates/footer.html'
})
export class FooterComponent {
	/** Indicates whether this cyph was initiated via the API. */
	@Input() public wasInitiatedByAPI: boolean;

	/** @see Env */
	public readonly env: Env	= env;

	constructor () {}
}
