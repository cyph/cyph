import {Templates} from 'templates';
import {Config} from 'cyph/config';
import {Env} from 'cyph/env';
import {Util} from 'cyph/util';


/**
 * Angular directive for contact form UI component.
 */
export class Contact {
	/** Module/directive title. */
	public static title: string	= 'cyphContact';

	private static _	= (() => {
		angular.module(Contact.title, []).directive(Contact.title, () => ({
			restrict: 'E',
			replace: false,
			template: Templates.contact,
			link: (scope, element, attrs) => {
				const watch	= (attr: string) => scope.$watch(attrs[attr], (value: string) => {
					scope[attr]	= value;
				});

				watch('fromEmail');
				watch('fromName');
				watch('to');
				watch('subject');
				watch('message');

				element.find('button').click(() => Util.email(<any> scope));
			}
		}));
	})();
}
