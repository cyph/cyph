import {Templates} from 'ui/templates';


/**
 * Angular component for the new cyph spin-up screen.
 */
export class StaticCyphSpinningUp {
	/** Module/component title. */
	public static title: string	= 'cyphStaticCyphSpinningUp';

	private static _	= (() => {
		angular.module(
			StaticCyphSpinningUp.title,
			[]
		).directive(StaticCyphSpinningUp.title, () => ({
			restrict: 'A',
			link: scope => {
				scope['Cyph']	= self['Cyph'];
				scope['ui']		= self['ui'];
			},
			template: Templates.staticCyphSpinningUp
		}));
	})();
}
