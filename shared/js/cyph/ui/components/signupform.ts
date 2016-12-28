import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
import {SignupForm as SignupFormService} from '../signupform';


/**
 * Angular component for signup form.
 */
@Component({
	selector: 'cyph-signup-form',
	templateUrl: '../../../../templates/signupform.html'
})
export class SignupForm {
	/** @see ISignupForm */
	@Input() public self: SignupFormService;

	/** Indicates whether or not to display invite-code-related UI. */
	@Input() public invite: boolean;

	/** @see Env */
	public readonly env: Env	= env;

	constructor () {}
}
