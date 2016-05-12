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
			link: (scope, element, attrs) => Util.retryUntilComplete(retry => {
				const ui: any	= self['ui'];

				if (!ui) {
					setTimeout(retry, 250);
					return;
				}

				scope['ui']		= ui;
				scope['Cyph']	= self['Cyph'];

				const watch	= (attr: string) => scope.$watch(attrs[attr], (value: string) => {
					scope[attr]	= value;	
					ui.controller.update();
				});

				watch('fromEmail');
				watch('fromName');
				watch('to');
				watch('subject');
				watch('message');

				element.find('button').click(() => {
					Util.email(<any> scope);
					scope['sent']	= true;
					self['ui'].controller.update();
				});
			})
		}));
	})();
}
