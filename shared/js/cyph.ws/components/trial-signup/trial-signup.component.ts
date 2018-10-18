import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../../cyph/base-provider';
import {EnvService} from '../../../cyph/services/env.service';
import {StringsService} from '../../../cyph/services/strings.service';
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

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.appService.loadComplete();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly appService: AppService,

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
