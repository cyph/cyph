import {Templates} from 'ui/templates';


/**
 * Angular component for the cyph not found screen.
 */
export class StaticCyphNotFound {
	/** Module/component title. */
	public static title: string	= 'cyphStaticCyphNotFound';

	private Cyph: any	= self['Cyph'];
	private ui: any		= self['ui'];

	constructor () {}

	private static _	= (() => {
		angular.module(
			StaticCyphNotFound.title,
			[]
		).component(StaticCyphNotFound.title, {
			controller: StaticCyphNotFound,
			template: Templates.staticCyphNotFound
		});
	})();
}
