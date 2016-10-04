import {Templates} from '../templates';


/**
 * Angular component for static footer content.
 */
export class StaticFooter {
	/** Module/component title. */
	public static title: string	= 'cyphStaticFooter';

	private Cyph: any	= self['Cyph'];
	private ui: any		= self['ui'];

	constructor () {}

	private static _	= (() => {
		angular.module(
			StaticFooter.title,
			[]
		).component(StaticFooter.title, {
			controller: StaticFooter,
			template: Templates.staticFooter
		});
	})();
}
