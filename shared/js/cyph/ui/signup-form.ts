import {analytics} from '../analytics';
import {env} from '../env';
import {util} from '../util';
import {elements} from './elements';


/**
 * Represents a form to register for cyph.me waitlist.
 */
export class SignupForm {
	/** Used to track which users signed up through our promo page. */
	public promo: string;

	/** Ordinal number indicating which screen of this form is active. */
	public state: number	= 0;

	/** Signup data entered by user. */
	public readonly data	= {
		email: <string> '',
		inviteCode: <string> '',
		language: <string> env.fullLanguage,
		name: <string> ''
	};

	/**
	 * Submits signup data to server.
	 */
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

		analytics.sendEvent({
			eventAction: 'new',
			eventCategory: 'signup',
			eventValue: 1,
			hitType: 'event'
		});

		if (this.promo) {
			analytics.sendEvent({
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
