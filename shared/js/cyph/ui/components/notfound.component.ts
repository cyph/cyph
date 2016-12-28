import {Component} from '@angular/core';
import {Env, env} from '../../env';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-not-found',
	templateUrl: '../../../../templates/notfound.html'
})
export class NotFoundComponent {
	/** @see Env */
	public readonly env: Env	= env;

	constructor () {}
}
