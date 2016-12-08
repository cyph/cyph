import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
import {ISignupForm} from '../isignupform';


/**
 * Angular component for register UI.
 */
@Component({
	selector: 'cyph-register',
	templateUrl: '../../../../templates/register.html'
})
export class Register {
	/** @ignore */
	@Input() public signupForm: ISignupForm;

	/** @ignore */
	@Input() public invite: boolean;

	/** @ignore */
	public env: Env	= env;

	constructor () {}
}
