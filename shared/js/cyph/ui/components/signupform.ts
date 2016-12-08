import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
import {ISignupForm} from '../isignupform';


/**
 * Angular component for signup form.
 */
@Component({
	selector: 'cyph-signup-form',
	templateUrl: '../../../../templates/signupform.html'
})
export class SignupForm {
	/** @ignore */
	@Input() public self: ISignupForm;

	/** @ignore */
	@Input() public invite: boolean;

	/** @ignore */
	public env: Env	= env;

	constructor () {}
}
