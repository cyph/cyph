import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountProfileService} from '../services/account-profile.service';
import {EnvService} from '../services/env.service';
import * as Granim from 'granim';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['../../css/components/account-profile.css'],
	templateUrl: '../../../templates/account-profile.html'
})
export class AccountProfileComponent {
	/** @inheritDoc */
	public ngOnInit () : void {
		console.log( 'Starting Granim' );
		const granim	= !this.envService.isWeb ? undefined : new Granim({
			direction: 'radial',
			element: '#profile-gradient',
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
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountProfileService */
		public readonly accountProfileService: AccountProfileService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
