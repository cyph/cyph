import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
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
	public readonly apiKey: Observable<string | undefined> =
		this.activatedRoute.params.pipe(map(o => o.apiKey));

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.appService.loadComplete();
	}

	/** Tries unlocking with the given API key. */
	public unlock (apiKey?: string) : void {
		if (!apiKey) {
			return;
		}

		this.appService.isLockedDown.next(true);
		this.router.navigate(['unlock', apiKey]);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly appService: AppService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
