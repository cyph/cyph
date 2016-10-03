import {Templates} from 'ui/templates';


/**
 * Angular namespace with directives for static UI components.
 */
export class Static {
	/** Module title + namespace for included directives. */
	public static title: string	= 'cyphStatic';

	private static _	= (() => {
		angular.module(Static.title, []).
			directive(Static.title + 'CyphNotFound', () => ({
				restrict: 'A',
				link: scope => {
					scope['Cyph']	= self['Cyph'];
					scope['ui']		= self['ui'];
				},
				template: Templates.staticCyphNotFound
			})).
			directive(Static.title + 'CyphSpinningUp', () => ({
				restrict: 'A',
				link: scope => {
					scope['Cyph']	= self['Cyph'];
					scope['ui']		= self['ui'];
				},
				template: Templates.staticCyphSpinningUp
			})).
			directive(Static.title + 'Footer', () => ({
				restrict: 'A',
				link: scope => {
					scope['Cyph']	= self['Cyph'];
					scope['ui']		= self['ui'];
				},
				template: Templates.staticFooter
			}))
		;
	})();
}
