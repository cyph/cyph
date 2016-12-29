import {Injectable} from '@angular/core';
import {analytics} from '../../analytics';
import {env} from '../../env';
import {eventManager} from '../../event-manager';
import {util} from '../../util';


/**
 * Angular service that handles waitlist signups.
 */
@Injectable()
export class SignupService {
	/** Event for setting data.inviteCode. */
	public static inviteEvent: string	= 'SignupServiceInviteEvent';

	/** Event for setting promo. */
	public static promoEvent: string	= 'SignupServicePromoEvent';


	/** Signup data entered by user. */
	public readonly data	= {
		email: <string> '',
		inviteCode: <string> '',
		language: <string> env.fullLanguage,
		name: <string> ''
	};

	/** Used to track which users signed up through a promo page. */
	public promo: string	= '';

	/** Ordinal number indicating which screen of this form is active. */
	public state: number		= 0;

	/** Submits signup data to server. */
	public async submit () : Promise<void> {
		++this.state;

		if (!this.data.email) {
			return;
		}

		if (this.state === 1) {
			++this.state;
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

	constructor () {
		eventManager.on(SignupService.inviteEvent, (inviteCode: string) => {
			this.data.inviteCode	= inviteCode;
		});

		eventManager.on(SignupService.promoEvent, (promo: string) => {
			this.promo	= promo;
		});
	}
}
