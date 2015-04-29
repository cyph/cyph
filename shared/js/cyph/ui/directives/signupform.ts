module Cyph {
	export module UI {
		export module Directives {
			export class SignupForm {
				public static title: string	= 'ngCyphSignupForm';

				private static _	= (() => {
					angular.module(SignupForm.title, []).directive(SignupForm.title, () => ({
						restrict: 'A',
						transclude: true,
						scope: {
							$this: '=' + SignupForm.title,
							hideButton: '=hideButton'
						},
						link: scope => scope['Cyph'] = Cyph,
						template: Templates.signupForm
					}));
				})();
			}
		}
	}
}
