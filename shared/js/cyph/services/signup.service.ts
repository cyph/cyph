import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
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
		email: new BehaviorSubject<string>(''),
		inviteCode: new BehaviorSubject<string>(''),
		name: new BehaviorSubject<string>('')
	};

	/** Used to track which users signed up through a promo page. */
	public readonly promo	= new BehaviorSubject<string>('');

	/** Ordinal number indicating which screen of this form is active. */
	public readonly state	= new BehaviorSubject<number>(0);

	/** Submits signup data to server. */
	public async submit () : Promise<void> {
		this.state.next(this.state.value + 1);

		if (!this.data.email.value) {
			return;
		}

		if (this.state.value === 1) {
			this.state.next(this.state.value + 1);
		}

		const signupResult: string	= await request({
			data: {
				email: this.data.email.value,
				inviteCode: this.data.inviteCode.value,
				language: this.envService.fullLanguage,
				name: this.data.name.value
			},
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

		if (this.promo.value) {
			this.analyticsService.sendEvent({
				hitType: 'social',
				socialAction: 'signup',
				socialNetwork: 'promo-' + this.promo.value,
				socialTarget: this.data.email.value
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
