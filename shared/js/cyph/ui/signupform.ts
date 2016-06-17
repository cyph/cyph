import {Elements} from 'elements';
import {ISignupForm} from 'isignupform';
import {Analytics} from 'cyph/analytics';
import {Env} from 'cyph/env';
import {IController} from 'cyph/icontroller';
import {Util} from 'cyph/util';


export class SignupForm implements ISignupForm {
	public promo: string;

	public state: number	= 0;

	public data	= {
		name: <string> '',
		email: <string> '',
		list: <string> 'Q4YKsEDh2OULosfbBg3IVw',
		boolean: <boolean> true
	};

	private sendyRequest (method: string) : Promise<string> {
		return Util.request({
			method: 'POST',
			url: 'https://sendy.cyph.com/' + method,
			data: this.data,
			retries: 5
		});
	}

	public async submit () : Promise<void> {
		++this.state;

		if (this.data.email && this.state === 1) {
			++this.state;
		}

		this.controller.update();

		setTimeout(() => {
			const $input: JQuery	= $(Elements.signupForm.selector).
				filter(':visible').
				find('input:visible:not([disabled])')
			;

			if ($input.length === 1) {
				$input.focus();
			}
		}, 250);

		if (this.data.email) {
			const response: string	= await this.sendyRequest('subscribe');

			if (response === '1') {
				Analytics.send({
					hitType: 'event',
					eventCategory: 'signup',
					eventAction: 'new',
					eventValue: 1
				});

				if (this.promo) {
					Analytics.send({
						hitType: 'social',
						socialNetwork: 'promo-' + this.promo,
						socialAction: 'signup',
						socialTarget: this.data.email
					});
				}
			}
			else if (response === 'Already subscribed.' && this.data.name) {
				await this.sendyRequest('unsubscribe');
				this.sendyRequest('subscribe');
			}
		}
	}

	/**
	 * @param controller
	 */
	public constructor (private controller: IController) {
		setTimeout(() =>
			Elements.signupForm.addClass('visible')
		, 500);
	}
}
