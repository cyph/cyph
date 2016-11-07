import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for the new cyph spin-up screen.
 */
export class StaticCyphSpinningUp {
	/** Module/component title. */
	public static title: string	= 'cyphStaticCyphSpinningUp';

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
			StaticCyphSpinningUp.title,
			[]
		).component(StaticCyphSpinningUp.title, {
			controller: StaticCyphSpinningUp,
			template: Templates.staticCyphSpinningUp
		});
	})();
}
