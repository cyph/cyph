import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for static footer content.
 */
export class StaticFooter {
	/** Component title. */
	public static title: string	= 'cyphStaticFooter';

	/** Component configuration. */
	public static config		= {
		controller: StaticFooter,
		template: Templates.staticFooter
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
