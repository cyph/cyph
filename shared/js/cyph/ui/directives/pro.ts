import {Templates} from 'templates';


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
			link: scope => scope['Cyph'] = self['Cyph'],
			template: Templates.pro
		}));
	})();
}
