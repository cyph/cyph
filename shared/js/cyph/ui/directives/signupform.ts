import {Templates} from 'templates';


/**
 * Angular directive for signup form component.
 */
export class SignupForm {
	/** Module/directive title. */
	public static title: string	= 'cyphSignupForm';

	private static _	= (() => {
		angular.module(SignupForm.title, []).directive(SignupForm.title, () => ({
			restrict: 'A',
			transclude: true,
			scope: {
				$this: '=' + SignupForm.title,
				hideButton: '='
			},
			link: scope => scope['Cyph'] = self['Cyph'],
			template: Templates.signupForm
		}));
	})();
}
