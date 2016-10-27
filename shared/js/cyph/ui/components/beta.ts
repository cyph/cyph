import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for Cyph beta UI.
 */
export class Beta {
	/** Component title. */
	public static title: string	= 'cyphBeta';

	/** Component configuration. */
	public static config		= {
		controller: Beta,
		template: Templates.beta
	};


	public Cyph: any;
	public ui: any;

	public checking: boolean	= false;
	public error: boolean		= false;

	constructor ($scope, $element) { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];

		/* TODO: stop blatantly lying to people */
		$element.find('form').submit(() => {
			this.checking	= true;
			this.error		= false;
			this.ui.controller.update();

			setTimeout(() => {
				this.checking	= false;
				this.error		= true;
				this.ui.controller.update();
			}, Util.random(4000, 1500));
		});
	})(); }
}
