import {Injectable} from '@angular/core';
import {eventManager} from '../event-manager';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {EnvService} from './env.service';


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
		language: <string> this.envService.fullLanguage,
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
			retries: 5,
			url: this.envService.baseUrl + 'signups'
		});

		if (signupResult !== 'set') {
			return;
		}

		this.analyticsService.sendEvent({
			eventAction: 'new',
			eventCategory: 'signup',
			eventValue: 1,
			hitType: 'event'
		});

		if (this.promo) {
			this.analyticsService.sendEvent({
				hitType: 'social',
				socialAction: 'signup',
				socialNetwork: 'promo-' + this.promo,
				socialTarget: this.data.email
			});
		}
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		eventManager.on(SignupService.inviteEvent, (inviteCode: string) => {
			this.data.inviteCode	= inviteCode;
		});

		eventManager.on(SignupService.promoEvent, (promo: string) => {
			this.promo	= promo;
		});
	}
}
