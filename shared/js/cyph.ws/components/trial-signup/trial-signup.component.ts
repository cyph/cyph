import {Component, OnInit} from '@angular/core';
import {emailPattern} from '../../../cyph/email-pattern';
import {DatabaseService} from '../../../cyph/services/database.service';
import {EnvService} from '../../../cyph/services/env.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {request} from '../../../cyph/util/request';
import {AppService} from '../../app.service';


/**
 * Angular component for the Cyph trial signup screen.
 */
@Component({
	selector: 'cyph-trial-signup',
	styleUrls: ['./trial-signup.component.scss'],
	templateUrl: './trial-signup.component.html'
})
export class TrialSignupComponent implements OnInit {
	/** Generated API key. */
	public apiKey?: string;

	/** Indicates whether signup attempt is in progress. */
	public checking: boolean	= false;

	/** Email address. */
	public email: string		= '';

	/** @see emailPattern */
	public readonly emailPattern: typeof emailPattern	= emailPattern;

	/** Indicates whether the last signup attempt has failed. */
	public error: boolean		= false;

	/** Name. */
	public name: string			= '';

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.appService.loadComplete();
	}

	/** Initiates signup attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;

		try {
			this.apiKey	= await request({
				data: {
					email: this.email,
					name: this.name,
					namespace: this.databaseService.namespace
				},
				method: 'POST',
				url: this.envService.baseUrl + 'pro/trialsignup'
			});

			if (!this.apiKey) {
				throw new Error('Empty API key.');
			}
		}
		catch {
			this.error		= true;
		}
		finally {
			this.checking	= false;
		}
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
