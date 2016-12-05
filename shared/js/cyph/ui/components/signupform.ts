import {Component, Input} from '@angular/core';
import {Util} from '../../util';
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
	public cyph: any;

	constructor () { (async () => {
		while (!cyph) {
			await Util.sleep();
		}

		this.cyph	= cyph;
	})(); }
}
