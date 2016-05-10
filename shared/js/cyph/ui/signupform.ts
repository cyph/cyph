import {Elements} from 'elements';
import {ISignupForm} from 'isignupform';
import {Analytics} from 'cyph/analytics';
import {Env} from 'cyph/env';
import {IController} from 'cyph/icontroller';
import {Util} from 'cyph/util';


export class SignupForm implements ISignupForm {
	public state: number	= 0;

	public data	= {
		Name: <string> '',
		Email: <string> '',
		List: <string> 'Q4YKsEDh2OULosfbBg3IVw',
		Boolean: <boolean> true

	};

	public submit () : void {
		if (!this.data.Email) {
					return;
				}

				++this.state;
				this.controller.update();

				if (this.state === 2) {
					setTimeout(() => {
						++this.state;
						this.controller.update();
					}, 1500);
				}

				setTimeout(() => {
					const $input: JQuery	= Elements.signupForm.find('input:visible');

					if ($input.length === 1) {
						$input.focus();
					}
				}, 100);


				Util.retryUntilComplete(retry =>
					Util.request({
						method: 'PUT',
						url: Env.baseUrl + 'signups',
						data: this.data,
						error: retry,
						success: (isNew: string) => {
							if (isNew === 'true') {
								Analytics.main.send({
									hitType: 'event',
									eventCategory: 'signup',
									eventAction: 'new',
									eventValue: 1
								});
							}
						}
					})
				);
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
