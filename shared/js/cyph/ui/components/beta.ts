import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for Cyph beta UI.
 */
export class Beta {
	/** Module/component title. */
	public static title: string	= 'cyphBeta';

	private Cyph: any			= self['Cyph'];
	private ui: any				= self['ui'];
	private checking: boolean	= false;
	private error: boolean		= false;

	constructor ($scope, $element, $attrs) {
		/* TODO: stop blatantly lying to people */
		$element.find('form').submit(() => {
			this.checking	= true;
			this.error		= false;
			self['ui'].controller.update();

			setTimeout(() => {
				this.checking	= false;
				this.error		= true;
				self['ui'].controller.update();
			}, Util.random(4000, 1500));
		});
	}

	private static _	= (() => {
		angular.module(Beta.title, []).component(Beta.title, {
			controller: Beta,
			template: Templates.beta
		});
	})();
}
