import {Templates} from 'ui/templates';
import {Config} from 'cyph/config';
import {Env} from 'cyph/env';
import {Util} from 'cyph/util';


/**
 * Angular component for contact form UI.
 */
export class Contact {
	/** Module/component title. */
	public static title: string	= 'cyphContact';

	private Cyph: any;
	private ui: any;

	private self: {
		fromEmail: string;
		fromName: string;
		message: string;
		to: string;
		sent: boolean;
		subject: string;
	};

	constructor ($scope, $element, $attrs) {
		Util.retryUntilComplete(retry => {
			this.Cyph	= self['Cyph'];
			this.ui		= self['ui'];

			if (!this.Cyph || !this.ui) {
				retry();
				return;
			}

			if (!this.self) {
				this.self	= {
					fromEmail: '',
					fromName: '',
					message: '',
					to: '',
					sent: false,
					subject: ''
				};
			}

			for (let k of ['fromEmail', 'fromName', 'to', 'subject', 'message']) {
				if ($attrs[k]) {
					this.self[k]	= $attrs[k];
				}
			}

			this.ui.controller.update();

			$element.find('button').click(() => {
				Util.email(this.self);
				this.self.sent	= true;
				this.ui.controller.update();
			});
		});
	}

	private static _	= (() => {
		angular.module(Contact.title, []).component(Contact.title, {
			bindings: {
				self: '<'
			},
			controller: Contact,
			template: Templates.contact
		});
	})();
}
