import {Component, OnInit} from '@angular/core';
import * as Granim from 'granim';
import {EnvService} from '../cyph/services/env.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {AppService} from './app.service';
import {AccountStates} from './enums';

/**
 * Angular component for the Cyph account screen.
 */
@Component({
	selector: 'cyph-account',
	styleUrls: ['../css/components/cyph.im/account.css'],
	templateUrl: '../../templates/cyph.im/account.html'
})
export class AccountComponent implements OnInit {
	/** Indicates whether the sidebar should take up the entire view. */
	public get showOnlySidebar () : boolean {
		return [
			AccountStates.contacts
		].filter(
			state => state === this.appService.accountState
		).length > 0;
	}

	/** Indicates whether sidebar should be displayed. */
	public get sidebarVisible () : boolean {
		return [
			AccountStates.contacts,
			AccountStates.home
		].filter(
			state => state === this.appService.accountState
		).length > 0;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.urlStateService.trigger();

		if (this.envService.coBranded) {
			return;
		}

		/* tslint:disable-next-line:no-unused-new */
		new Granim({
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
