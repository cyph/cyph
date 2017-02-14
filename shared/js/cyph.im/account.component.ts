import {Component, OnInit} from '@angular/core';
import {UrlStateService} from '../cyph/services/url-state.service';
import {AppService} from './app.service';
import {EnvService} from '../cyph/services/env.service';
import * as Granim from 'granim';

/**
 * Angular component for the Cyph account screen.
 */
@Component({
	selector: 'cyph-account',
	styleUrls: ['../css/components/cyph.im/account.css'],
	templateUrl: '../../templates/cyph.im/account.html'
})
export class AccountComponent implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		this.urlStateService.trigger();
		const granim	= !this.envService.isWeb ? undefined : new Granim({
			direction: 'radial',
			element: '.cyph-gradient',
			isPausedWhenNotInView: true,
			name: 'basic-gradient',
			opacity: [1, .5, 0],
			states : {
				'default-state': {
					gradients: [
						['#392859', '#624599'],
						['#9368E6', '#624599']
					],
					loop: true,
					transitionSpeed: 5000
				}
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly urlStateService: UrlStateService,

		/** @see AppService */
		public readonly appService: AppService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
