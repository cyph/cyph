import {Templates} from 'ui/templates';


/**
 * Angular directive for the new cyph spin-up screen.
 */
export class StaticCyphSpinningUp {
	/** Module/directive title. */
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
