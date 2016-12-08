import {Component} from '@angular/core';
import {Env, env} from '../../env';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-static-cyph-not-found',
	templateUrl: '../../../../templates/staticcyphnotfound.html'
})
export class StaticCyphNotFound {
	/** @ignore */
	public env: Env	= env;

	constructor () {}
}
