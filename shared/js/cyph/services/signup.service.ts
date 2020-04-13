import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {request} from '../util/request';
import {AnalyticsService} from './analytics.service';
import {EnvService} from './env.service';

/**
 * Angular service that handles waitlist signups.
 */
@Injectable()
export class SignupService extends BaseProvider {
	/** Signup data entered by user. */
	public readonly data = {
		email: new BehaviorSubject<string>(''),
		featureInterest: new BehaviorSubject<string>(''),
		inviteCode: new BehaviorSubject<string>(''),
		name: new BehaviorSubject<string>(''),
		usernameRequest: new BehaviorSubject<string>('')
	};

	/** Used to track which users signed up through a promo page. */
	public readonly promo = new BehaviorSubject<string>('');

	/** Ordinal number indicating which screen of this form is active. */
	public readonly state = new BehaviorSubject<number>(0);

	/** Submits signup data to server. */
	public async submit ({
		email = this.data.email.value,
		featureInterest = this.data.featureInterest.value,
		inviteCode = this.data.inviteCode.value,
		name = this.data.name.value,
		usernameRequest = this.data.usernameRequest.value
	}: {
		email?: string;
		featureInterest?: string;
		inviteCode?: string;
		name?: string;
		usernameRequest?: string;
	} = {}) : Promise<void> {
		this.state.next(this.state.value + 1);

		if (!email) {
			return;
		}

		if (this.state.value === 1) {
			this.state.next(this.state.value + 1);
		}

		const signupResult = await request({
			data: {
				email,
				featureInterest,
				inviteCode,
				language: this.envService.fullLanguage,
				name,
				usernameRequest
			},
			method: 'PUT',
			retries: 5,
			url: this.envService.baseUrl + 'signups'
		});

		if (signupResult !== 'set') {
			return;
		}

		this.analyticsService.sendEvent('signup', 'new');

		/*
		if (!this.promo.value) {
			return;
		}

		TODO: Send PR to universal-analytics

		this.analyticsService.sendEvent({
			hitType: 'social',
			socialAction: 'signup',
			socialNetwork: 'promo-' + this.promo.value,
			socialTarget: email
		});
		*/
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super();
	}
}
