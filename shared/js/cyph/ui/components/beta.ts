import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for Cyph beta UI.
 */
export class Beta {
	/** Module/component title. */
	public static title: string	= 'cyphBeta';

	private checking: boolean	= false;
	private error: boolean		= false;

	private Cyph: any;
	private ui: any;

	constructor ($scope, $element, $attrs) { (async () => {
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

	private static _	= (() => {
		angular.module(Beta.title, []).component(Beta.title, {
			controller: Beta,
			template: Templates.beta
		});
	})();
}
