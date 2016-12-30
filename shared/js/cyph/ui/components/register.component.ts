import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
import {SignupService} from '../services/signup.service';


/**
 * Angular component for register UI.
 */
@Component({
	selector: 'cyph-register',
	templateUrl: '../../../../templates/register.html'
})
export class RegisterComponent {
	/** @see SignupFormComponent.invite */
	@Input() public invite: boolean;

	/** @see Env */
	public readonly env: Env	= env;

	constructor (
		/** @see SignupService */
		public readonly signupService: SignupService
	) {}
}
