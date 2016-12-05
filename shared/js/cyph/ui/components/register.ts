import {Component, Input} from '@angular/core';
import {Util} from '../../util';
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
	public cyph: any;

	constructor () { (async () => {
		while (!cyph) {
			await Util.sleep();
		}

		this.cyph	= cyph;
	})(); }
}
