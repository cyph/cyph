import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for the new cyph spin-up screen.
 */
export class StaticCyphSpinningUp {
	/** Component title. */
	public static title: string	= 'cyphStaticCyphSpinningUp';

	/** Component configuration. */
	public static config		= {
		controller: StaticCyphSpinningUp,
		template: Templates.staticCyphSpinningUp
	};


	public Cyph: any;
	public ui: any;

	constructor () { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];
	})(); }
}
