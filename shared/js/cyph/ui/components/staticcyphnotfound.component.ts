import {Component} from '@angular/core';
import {Env, env} from '../../env';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-static-cyph-not-found',
	templateUrl: '../../../../templates/staticcyphnotfound.html'
})
export class StaticCyphNotFoundComponent {
	/** @see Env */
	public readonly env: Env	= env;

	constructor () {}
}
