import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for static footer content.
 */
export class StaticFooter {
	/** Module/component title. */
	public static title: string	= 'cyphStaticFooter';

	private Cyph: any;
	private ui: any;

	constructor () { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];
	})(); }

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
