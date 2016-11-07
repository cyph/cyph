import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for the cyph not found screen.
 */
export class StaticCyphNotFound {
	/** Module/component title. */
	public static title: string	= 'cyphStaticCyphNotFound';

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
			StaticCyphNotFound.title,
			[]
		).component(StaticCyphNotFound.title, {
			controller: StaticCyphNotFound,
			template: Templates.staticCyphNotFound
		});
	})();
}
