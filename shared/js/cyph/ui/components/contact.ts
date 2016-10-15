import {Templates} from '../templates';
import {Config} from '../../config';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for contact form UI.
 */
export class Contact {
	/** Component title. */
	public static title: string	= 'cyphContact';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: Contact,
		template: Templates.contact
	};


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

	constructor ($scope, $element) { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];

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
			const v	= $element.attr(k);
			if (v) {
				this.self[k]	= v;
			}
		}

		$element.find('button').click(() => {
			Util.email(this.self);
			this.self.sent	= true;
		});
	})(); }
}
