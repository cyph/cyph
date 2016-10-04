import {Templates} from 'ui/templates';


/**
 * Angular component for static footer content.
 */
export class StaticFooter {
	/** Module/component title. */
	public static title: string	= 'cyphStaticFooter';

	private static _	= (() => {
		angular.module(
			StaticFooter.title,
			[]
		).directive(StaticFooter.title, () => ({
			restrict: 'A',
			link: scope => {
				scope['Cyph']	= self['Cyph'];
				scope['ui']		= self['ui'];
			},
			template: Templates.staticFooter
		}));
	})();
}
