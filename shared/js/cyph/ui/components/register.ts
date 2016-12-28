import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
import {SignupForm} from '../signupform';


/**
 * Angular component for register UI.
 */
@Component({
	selector: 'cyph-register',
	templateUrl: '../../../../templates/register.html'
})
export class Register {
	/** @see ISignupForm */
	@Input() public signupForm: SignupForm;

	/** @see SignupForm.invite */
	@Input() public invite: boolean;

	/** @see Env */
	public readonly env: Env	= env;

	constructor () {}
}
