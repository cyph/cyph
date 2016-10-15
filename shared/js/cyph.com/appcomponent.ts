import {Templates} from '../cyph/ui/templates';
import {Util} from '../cyph/util';


/**
 * Angular component for Cyph home page.
 */
export class AppComponent {
	/** Component title. */
	public static title: string	= 'cyphApp';

	/** Component configuration. */
	public static config		= {
		controller: AppComponent,
		template: Templates.home
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
