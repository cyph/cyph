/// <reference path="templates.ts" />


module Cyph {
	export module UI {
		export module Directives {
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
