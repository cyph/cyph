import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';


/**
 * Angular component for static footer content.
 */
@Component({
	selector: 'cyph-static-footer',
	templateUrl: '../../../../templates/staticfooter.html'
})
export class StaticFooterComponent {
	/** Indicates whether this cyph was initiated via the API. */
	@Input() public wasInitiatedByAPI: boolean;

	/** @see Env */
	public readonly env: Env	= env;

	constructor () {}
}
