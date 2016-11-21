import {Analytics} from '../analytics';
import {Env} from '../env';
import {Util} from '../util';
import {Elements} from './elements';
import {ISignupForm} from './isignupform';


/** @inheritDoc */
export class SignupForm implements ISignupForm {
	/** @inheritDoc */
	public promo: string;

	/** @inheritDoc */
	public state: number	= 0;

	/** @inheritDoc */
	public data	= {
		email: <string> '',
		inviteCode: <string> '',
		language: <string> Env.fullLanguage,
		name: <string> ''
	};

	/** @inheritDoc */
	public async submit () : Promise<void> {
		++this.state;

		if (this.data.email && this.state === 1) {
			++this.state;
		}

		setTimeout(
			() => {
				const $input: JQuery	= $(Elements.signupForm().selector).
					filter(':visible').
					find('input:visible:not([disabled])')
				;

				if ($input.length === 1) {
					$input.focus();
				}
			},
			250
		);

		if (!this.data.email) {
			return;
		}

		const signupResult: string	= await Util.request({
			data: this.data,
			method: 'PUT',
			retries: 3,
			url: Env.baseUrl + 'signups'
		});

		if (signupResult !== 'set') {
			return;
		}

		Analytics.send({
			eventAction: 'new',
			eventCategory: 'signup',
			eventValue: 1,
			hitType: 'event'
		});

		if (this.promo) {
			Analytics.send({
				hitType: 'social',
				socialAction: 'signup',
				socialNetwork: 'promo-' + this.promo,
				socialTarget: this.data.email
			});
		}
	}

	constructor () {
		setTimeout(() => Elements.signupForm().addClass('visible'), 500);
	}
}
