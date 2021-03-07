import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {BaseProvider} from '../../../cyph/base-provider';
import {EnvService} from '../../../cyph/services/env.service';
import {SignupService} from '../../../cyph/services/signup.service';
import {StringsService} from '../../../cyph/services/strings.service';

/**
 * Angular component for beta register UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-beta-register',
	styleUrls: ['./beta-register.component.scss'],
	templateUrl: './beta-register.component.html'
})
export class BetaRegisterComponent extends BaseProvider {
	/** @see SignupFormComponent.invite */
	@Input() public invite: boolean = false;

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SignupService */
		public readonly signupService: SignupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
