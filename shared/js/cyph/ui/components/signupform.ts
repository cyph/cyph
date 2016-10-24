import {ISignupForm} from '../isignupform';
import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for signup form.
 */
export class SignupForm {
	/** Component title. */
	public static title: string	= 'cyphSignupForm';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<',
			invite: '<'
		},
		controller: SignupForm,
		template: Templates.signupForm,
		transclude: true
	};


	public Cyph: any;
	public self: ISignupForm;
	public invite: string;

	constructor () { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
	})(); }
}
