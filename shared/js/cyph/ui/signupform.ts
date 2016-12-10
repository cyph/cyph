import {analytics} from '../analytics';
import {env} from '../env';
import {util} from '../util';
import {elements} from './elements';
import {ISignupForm} from './isignupform';


/** @inheritDoc */
export class SignupForm implements ISignupForm {
	/** @inheritDoc */
	public readonly promo: string;

	/** @inheritDoc */
	public state: number	= 0;

	/** @inheritDoc */
	public readonly data	= {
		email: <string> '',
		inviteCode: <string> '',
		language: <string> env.fullLanguage,
		name: <string> ''
	};

	/** @inheritDoc */
	public async submit () : Promise<void> {
		++this.state;

		if (this.data.email && this.state === 1) {
			++this.state;
		}

		(async () => {
			await util.sleep();

			const $input: JQuery	= $(elements.signupForm().selector).
				filter(':visible').
				find('input:visible:not([disabled])')
			;

			if ($input.length === 1) {
				$input.focus();
			}
		})();

		if (!this.data.email) {
			return;
		}

		const signupResult: string	= await util.request({
			data: this.data,
			method: 'PUT',
			retries: 3,
			url: env.baseUrl + 'signups'
		});

		if (signupResult !== 'set') {
			return;
		}

		analytics.send({
			eventAction: 'new',
			eventCategory: 'signup',
			eventValue: 1,
			hitType: 'event'
		});

		if (this.promo) {
			analytics.send({
				hitType: 'social',
				socialAction: 'signup',
				socialNetwork: 'promo-' + this.promo,
				socialTarget: this.data.email
			});
		}
	}

	constructor () { (async () => {
		await util.sleep(500);
		elements.signupForm().addClass('visible');
	})(); }
}
