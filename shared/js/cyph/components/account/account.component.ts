import {AfterViewInit, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as Granim from 'granim';
import {AccountEnvService} from '../../services/account-env.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {translate} from '../../util/translate';
import {resolvable} from '../../util/wait';


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
	styleUrls: ['./account.component.scss'],
	templateUrl: './account.component.html'
})
export class AccountComponent implements AfterViewInit, OnInit {
	/** @ignore */
	private readonly _VIEW_INITIATED					= resolvable();

	/** @ignore */
	private readonly resolveViewInitiated: () => void	= this._VIEW_INITIATED.resolve;

	/** Resolves after view init. */
	public readonly viewInitiated: Promise<void>		= this._VIEW_INITIATED.promise;

	/** @ignore */
	private get route () : string {
		return (
			this.activatedRoute.snapshot.firstChild &&
			this.activatedRoute.snapshot.firstChild.url.length > 0
		) ?
			this.activatedRoute.snapshot.firstChild.url[0].path :
			''
		;
	}

	/** Header title for current section. */
	public get header () : string|undefined {
		const route	= this.route;

		if (
			[
				'appointments',
				'contacts',
				'docs',
				'files',
				'forms',
				'notes'
			].indexOf(route) < 0 ||
			(
				this.activatedRoute.snapshot.firstChild &&
				this.activatedRoute.snapshot.firstChild.url.slice(-1)[0].path !== route
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
			'audio',
			'appointments',
			'chat-transition',
			'compose',
			'contacts',
			'docs',
			'files',
			'forms',
			'messages',
			'new-patient',
			'notes',
			'profile',
			'request-appointment',
			'request-followup',
			'settings',
			'video'
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
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (!this.envService.coBranded && !this.envService.isExtension) {
			const selector	= '.cyph-gradient';

			const started	= this.accountService.isUiReady ?
				undefined :
				new Promise<void>(resolve => {
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
				})
			;

			/* tslint:disable-next-line:no-unused-expression */
			new Granim({
				direction: 'radial',
				element: selector,
				isPausedWhenNotInView: true,
				name: 'basic-gradient',
				opacity: [1, 0.5, 0],
				states: {
					'default-state': {
						gradients: !this.envService.isTelehealth ?
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
	}

	/** Indicates whether sidebar should be displayed. */
	public get sidebarVisible () : boolean {
		return this.accountDatabaseService.currentUser.value !== undefined &&
			!this.envService.isMobile &&
			!this.envService.isTelehealth &&
			[
				'',
				'chat-transition',
				'messages'
			].filter(
				path => this.route === path
			).length > 0
		;
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
