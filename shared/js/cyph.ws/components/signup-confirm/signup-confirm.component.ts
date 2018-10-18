import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../../cyph/base-provider';
import {EnvService} from '../../../cyph/services/env.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {AppService} from '../../app.service';


/**
 * Angular component for the Cyph signup confirmation screen.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-signup-confirm',
	styleUrls: ['./signup-confirm.component.scss'],
	templateUrl: './signup-confirm.component.html'
})
export class SignupConfirmComponent extends BaseProvider implements OnInit {
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
