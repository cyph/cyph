import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for the cyph not found screen.
 */
export class StaticCyphNotFound {
	/** Component title. */
	public static title: string	= 'cyphStaticCyphNotFound';

	/** Component configuration. */
	public static config		= {
		controller: StaticCyphNotFound,
		template: Templates.staticCyphNotFound
	};


	private Cyph: any;
	private ui: any;

	constructor () { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];
	})(); }
}
