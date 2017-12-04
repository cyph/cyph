import {Component, AfterViewInit, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import * as Granim from 'granim';
import {AccountEnvService} from '../services/account-env.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';
import {translate} from '../util/translate';


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
export class AccountComponent implements AfterViewInit, OnInit {
	/** @ignore */
	private resolveViewInitiated: () => void;

	/** Resolves after view init. */
	public readonly viewInitiated: Promise<void>	= new Promise(resolve => {
		this.resolveViewInitiated	= resolve;
	});

	/** @ignore */
	private get route () : string {
		return (
			this.activatedRouteService.snapshot.firstChild &&
			this.activatedRouteService.snapshot.firstChild.url.length > 0
		) ?
			this.activatedRouteService.snapshot.firstChild.url[0].path :
			''
		;
	}

	/** Header title for current section. */
	public get header () : string|undefined {
		const route	= this.route;

		if (
			[
				'contacts',
				'docs',
				'files',
				'forms',
				'notes'
			].indexOf(route) < 0 ||
			(
				this.activatedRouteService.snapshot.firstChild &&
				this.activatedRouteService.snapshot.firstChild.url.slice(-1)[0].path !== route
			)
		) {
			return;
		}

		return translate(this.route[0].toUpperCase() + this.route.slice(1));
	}

	/** Indicates whether menu should be displayed. */
	public get menuVisible () : boolean {
		return this.accountDatabaseService.currentUser.value !== undefined && [
			'',
			'chat',
			'contacts',
			'docs',
			'files',
			'forms',
			'notes',
			'profile',
			'settings'
		].filter(
			path => this.route === path
		).length > 0;
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		this.resolveViewInitiated();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.activatedRouteService.url.subscribe(async () => {
			const route	= this.route;

			if (this.accountDatabaseService.currentUser.value && route === 'login') {
				this.routerService.navigate(['account']);
			}
			else if (
				!this.accountDatabaseService.currentUser.value &&
				[
					'login',
					'profile',
					'register',
					'welcome'
				].indexOf(route) < 0
			) {
				this.routerService.navigate(['account', 'login'].concat(
					this.activatedRouteService.snapshot.firstChild ?
						this.activatedRouteService.snapshot.firstChild.url.map(o => o.path) :
						[]
				));
			}
		});

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (!this.envService.coBranded && !this.accountService.isExtension) {
			const selector	= '.cyph-gradient';

			const started	= this.accountService.isUiReady ? undefined : new Promise(resolve => {
				const elem	= document.querySelector(selector);
				const event	= 'granim:start';

				if (!elem) {
					resolve();
					return;
				}

				const handler	= () => {
					resolve();
					(<HTMLElement> elem).removeEventListener(event, handler);
				};

				(<HTMLElement> elem).addEventListener(event, handler);
			});

			/* tslint:disable-next-line:no-unused-expression */
			new Granim({
				direction: 'radial',
				element: selector,
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

			await started;
		}

		if (!this.accountService.isUiReady) {
			await this.viewInitiated;
			this.accountService.resolveUiReady();
		}
	}

	/** Indicates whether sidebar should be displayed. */
	public get sidebarVisible () : boolean {
		return this.accountDatabaseService.currentUser.value !== undefined &&
			!this.envService.isMobile &&
			[
				'',
				'chat'
			].filter(
				path => this.route === path
			).length > 0
		;
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
