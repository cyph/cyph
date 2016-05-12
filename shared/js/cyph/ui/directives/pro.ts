import {Templates} from 'templates';
import {Util} from 'cyph/util';


/**
 * Angular directive for Cyph Pro component.
 */
export class Pro {
	/** Module/directive title. */
	public static title: string	= 'cyphPro';

	private static _	= (() => {
		angular.module(Pro.title, []).directive(Pro.title, () => ({
			restrict: 'A',
			scope: {
				$this: '=' + Pro.title
			},
			template: Templates.pro,
			link: (scope, element, attrs) => {
				scope['Cyph']	= self['Cyph'];

				/* TODO: stop blatantly lying to people */
				element.find('form').submit(() => {
					scope['checking']	= true;
					scope['error']		= false;
					self['ui'].controller.update();

					setTimeout(() => {
						scope['checking']	= false;
						scope['error']		= true;
						self['ui'].controller.update();
					}, Util.random(4000, 1500));
				});
			}
		}));
	})();
}
