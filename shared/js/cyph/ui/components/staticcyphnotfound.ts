import {Templates} from 'ui/templates';


/**
 * Angular component for the cyph not found screen.
 */
export class StaticCyphNotFound {
	/** Module/component title. */
	public static title: string	= 'cyphStaticCyphNotFound';

	private static _	= (() => {
		angular.module(
			StaticCyphNotFound.title,
			[]
		).directive(StaticCyphNotFound.title, () => ({
			restrict: 'A',
			link: scope => {
				scope['Cyph']	= self['Cyph'];
				scope['ui']		= self['ui'];
			},
			template: Templates.staticCyphNotFound
		}));
	})();
}
