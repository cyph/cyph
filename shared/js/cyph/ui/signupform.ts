import {Elements} from 'elements';
import {ISignupForm} from 'isignupform';
import {Analytics} from 'cyph/analytics';
import {Env} from 'cyph/env';
import {IController} from 'cyph/icontroller';
import {Util} from 'cyph/util';


export class SignupForm implements ISignupForm {
	public state: number	= 0;

	public data	= {
		name: <string> '',
		email: <string> '',
		list: <string> 'Q4YKsEDh2OULosfbBg3IVw',
		boolean: <boolean> true
	};

	private sendyRequest (method: string, success: (response: string) => void = () => {}) : void {
		Util.retryUntilComplete(retry =>
			Util.request({
				method: 'POST',
				url: 'https://sendy.cyph.com/' + method,
				data: this.data,
				error: retry,
				success
			})
		);
	}

	public submit () : void {
		++this.state;
		this.controller.update();

		setTimeout(() => {
			const $input: JQuery	= Elements.signupForm.find('input:visible');

			if ($input.length === 1) {
				$input.focus();
			}
		}, 100);


		this.sendyRequest('subscribe', (response: string) => {
			if (response === '1') {
				Analytics.main.send({
					hitType: 'event',
					eventCategory: 'signup',
					eventAction: 'new',
					eventValue: 1
				});
			}
			else if (response === 'Already subscribed.' && this.data.name) {
				this.sendyRequest('unsubscribe', () => this.sendyRequest('subscribe'));
			}
		});
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
