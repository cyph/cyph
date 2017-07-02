import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import * as Granim from 'granim';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountEnvService} from '../services/account-env.service';
import {AccountService} from '../services/account.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for the Cyph account screen.
 */
@Component({
	providers: [
		{
			provide: EnvService,
			useClass: AccountEnvService
		}
	],
	selector: 'cyph-account',
	styleUrls: ['../../../css/components/account.scss'],
	templateUrl: '../../../templates/account.html'
})
export class AccountComponent implements OnInit {
	/** Indicates whether menu should be displayed. */
	public get menuVisible () : boolean {
		return this.accountDatabaseService.current !== undefined && [
			'chat',
			'contacts',
			'files',
			'notes',
			'profile',
			'settings'
		].filter(path =>
			this.activatedRouteService.snapshot.firstChild && (
				this.activatedRouteService.snapshot.firstChild.url.length < 1 ||
				this.activatedRouteService.snapshot.firstChild.url.map(o => o.path)[0] === path
			)
		).length > 0;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (!this.envService.coBranded && !this.accountService.isExtension) {
			/* tslint:disable-next-line:no-unused-expression */
			new Granim({
				direction: 'radial',
				element: '.cyph-gradient',
				isPausedWhenNotInView: true,
				name: 'basic-gradient',
				opacity: [1, 0.5, 0],
				states: {
					'default-state': {
						gradients: !this.accountService.isTelehealth ?
							[
								['#392859', '#624599'],
								['#9368e6', '#624599']
							] :
							[
								['#eeecf1', '#b7bccb'],
								['#b7bccb', '#eeecf1']
							]
						,
						loop: false,
						transitionSpeed: 5000
					}
				}
			});
		}

		await this.accountAuthService.ready;

		const path	= this.activatedRouteService.snapshot.url[0].path;

		if (this.accountDatabaseService.current && path === 'login') {
			this.routerService.navigate(['account']);
		}
		else if (!this.accountDatabaseService.current && path !== 'login') {
			this.routerService.navigate(['account', 'login']);
		}
	}

	/** Indicates whether sidebar should be displayed. */
	public get sidebarVisible () : boolean {
		return this.accountDatabaseService.current !== undefined && !this.envService.isMobile && [
			'chat'
		].filter(path =>
			this.activatedRouteService.snapshot.firstChild && (
				this.activatedRouteService.snapshot.firstChild.url.length < 1 ||
				this.activatedRouteService.snapshot.firstChild.url.map(o => o.path)[0] === path
			)
		).length > 0;
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
