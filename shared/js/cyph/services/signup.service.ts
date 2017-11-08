import {Injectable} from '@angular/core';
import {request} from '../util/request';
import {AnalyticsService} from './analytics.service';
import {EnvService} from './env.service';


/**
 * Angular service that handles waitlist signups.
 */
@Injectable()
export class SignupService {
	/** Signup data entered by user. */
	public readonly data	= {
		email: '',
		inviteCode: '',
		language: this.envService.fullLanguage,
		name: ''
	};

	/** Used to track which users signed up through a promo page. */
	public promo: string	= '';

	/** Ordinal number indicating which screen of this form is active. */
	public state: number	= 0;

	/** Submits signup data to server. */
	public async submit () : Promise<void> {
		++this.state;

		if (!this.data.email) {
			return;
		}

		if (this.state === 1) {
			++this.state;
		}

		const signupResult: string	= await request({
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
	) {}
}
