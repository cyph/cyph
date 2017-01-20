import {Injectable} from '@angular/core';
import {Env, env} from '../env';


/**
 * @see Env
 */
@Injectable()
export class EnvService extends Env {
	/** Version of newCyphUrl that bypasses onhashchange to force redirect when necessary. */
	public readonly newCyphUrlRedirect: string	= env.newCyphUrl;

	constructor () {
		super();
	}
}
