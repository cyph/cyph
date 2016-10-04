import {Templates} from '../templates';


/**
 * Angular component for the new cyph spin-up screen.
 */
export class StaticCyphSpinningUp {
	/** Module/component title. */
	public static title: string	= 'cyphStaticCyphSpinningUp';

	private Cyph: any	= self['Cyph'];
	private ui: any		= self['ui'];

	constructor () {}

	private static _	= (() => {
		angular.module(
			StaticCyphSpinningUp.title,
			[]
		).component(StaticCyphSpinningUp.title, {
			controller: StaticCyphSpinningUp,
			template: Templates.staticCyphSpinningUp
		});
	})();
}
