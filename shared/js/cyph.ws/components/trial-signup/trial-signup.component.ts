import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
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
	public readonly apiKey: Observable<string|undefined>	=
		this.activatedRoute.params.pipe(map(o => o.apiKey))
	;

	/** Indicates whether signup attempt is in progress. */
	public checking: boolean	= false;

	/** Company. */
	public company: string		= '';

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
			const url		= location.href.split('/').slice(0, 3).join('/');

			const [apiKey, {category, item}]	= await Promise.all([
				request({
					data: {
						company: this.company,
						email: this.email,
						name: this.name,
						namespace: this.databaseService.namespace,
						url
					},
					method: 'POST',
					url: this.envService.baseUrl + 'pro/trialsignup'
				}),
				this.activatedRoute.params.pipe<{category: string; item: string}>(
					filter(o => o.category && o.item),
					take(1)
				).toPromise()
			]);

			if (!apiKey) {
				throw new Error('Empty API key.');
			}

			location.href	=
				`${this.envService.homeUrl}checkout/${category}/${item}/${apiKey}?ref=${url}`
			;
		}
		catch {
			this.error		= true;
			this.checking	= false;
		}
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

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
