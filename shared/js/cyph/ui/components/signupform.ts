import {ISignupForm} from 'ui/isignupform';
import {Templates} from 'ui/templates';


/**
 * Angular component for signup form.
 */
export class SignupForm {
	/** Module/component title. */
	public static title: string	= 'cyphSignupForm';

	private Cyph: any	= self['Cyph'];

	private self: ISignupForm;

	constructor () {}

	private static _	= (() => {
		angular.module(SignupForm.title, []).component(SignupForm.title, {
			bindings: {
				self: '<',
				invite: '<'
			},
			controller: SignupForm,
			template: Templates.signupForm,
			transclude: true
		});
	})();
}
