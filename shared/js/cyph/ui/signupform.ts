import {Elements} from './elements';
import {ISignupForm} from './isignupform';
import {Analytics} from '../analytics';
import {Env} from '../env';
import {Util} from '../util';


export class SignupForm implements ISignupForm {
	public promo: string;

	public state: number	= 0;

	public data	= {
		email: <string> '',
		inviteCode: <string> '',
		language: <string> Env.fullLanguage,
		name: <string> ''
	};

	public async submit () : Promise<void> {
		++this.state;

		if (this.data.email && this.state === 1) {
			++this.state;
		}

		setTimeout(() => {
			const $input: JQuery	= $(Elements.signupForm.selector).
				filter(':visible').
				find('input:visible:not([disabled])')
			;

			if ($input.length === 1) {
				$input.focus();
			}
		}, 250);

		if (!this.data.email) {
			return;
		}

		const signupResult: string	= await Util.request({
			method: 'PUT',
			url: Env.baseUrl + 'signups',
			data: this.data,
			retries: 3
		});

		if (signupResult !== 'set') {
			return;
		}

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

	public constructor () {
		setTimeout(() =>
			Elements.signupForm.addClass('visible')
		, 500);
	}
}
