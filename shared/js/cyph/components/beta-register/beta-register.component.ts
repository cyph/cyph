import {Component, Input} from '@angular/core';
import {EnvService} from '../../services/env.service';
import {SignupService} from '../../services/signup.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for beta register UI.
 */
@Component({
	selector: 'cyph-beta-register',
	styleUrls: ['./beta-register.component.scss'],
	templateUrl: './beta-register.component.html'
})
export class BetaRegisterComponent {
	/** @see SignupFormComponent.invite */
	@Input() public invite: boolean	= false;

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SignupService */
		public readonly signupService: SignupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
