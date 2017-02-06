import {Component, Input} from '@angular/core';
import {EnvService} from '../services/env.service';
import {SignupService} from '../services/signup.service';


/**
 * Angular component for register UI.
 */
@Component({
	selector: 'cyph-register',
	styleUrls: ['../../css/components/register.css'],
	templateUrl: '../../../templates/register.html'
})
export class RegisterComponent {
	/** @see SignupFormComponent.invite */
	@Input() public invite: boolean;

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SignupService */
		public readonly signupService: SignupService
	) {}
}
