import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {BaseProvider} from '../../../cyph/base-provider';
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
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-trial-signup',
	styleUrls: ['./trial-signup.component.scss'],
	templateUrl: './trial-signup.component.html'
})
export class TrialSignupComponent extends BaseProvider implements OnInit {
	/** Generated API key. */
	public readonly apiKey: Observable<string|undefined>	=
		this.activatedRoute.params.pipe(map(o => o.apiKey))
	;

	/** Indicates whether signup attempt is in progress. */
	public readonly checking		= new BehaviorSubject<boolean>(false);

	/** Company. */
	public readonly company			= new BehaviorSubject<string>('');

	/** Email address. */
	public readonly email			= new BehaviorSubject<string>('');

	/** @see emailPattern */
	public readonly emailPattern	= emailPattern;

	/** Indicates whether the last signup attempt has failed. */
	public readonly error			= new BehaviorSubject<boolean>(false);

	/** Name. */
	public readonly name			= new BehaviorSubject<string>('');

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.appService.loadComplete();
	}

	/** Initiates signup attempt. */
	public async submit () : Promise<void> {
		this.checking.next(true);

		try {
			const url		= location.href.split('/').slice(0, 3).join('/');

			const [apiKey, {category, item}]	= await Promise.all([
				request({
					data: {
						company: this.company.value,
						email: this.email.value,
						name: this.name.value,
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
			this.error.next(true);
			this.checking.next(false);
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
		super();

		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
