/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import {
	ActivatedRoute,
	Data,
	NavigationEnd,
	NavigationStart,
	Params,
	Router,
	UrlSegment
} from '@angular/router';
import * as Hammer from 'hammerjs';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {filter, map, mergeMap, take} from 'rxjs/operators';
import {SecurityModels, User} from '../account';
import {BaseProvider} from '../base-provider';
import {ContactComponent} from '../components/contact';
import {NeverProto, StringProto} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {toInt} from '../util/formatting';
import {observableAll} from '../util/observable-all';
import {prettyPrint, stringify} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {translate} from '../util/translate';
import {uuid} from '../util/uuid';
import {resolvable, sleep} from '../util/wait';
import {AccountContactsService} from './account-contacts.service';
import {AccountFilesService} from './account-files.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {ConfigService} from './config.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {StringsService} from './strings.service';
import {WindowWatcherService} from './window-watcher.service';


/**
 * Account service.
 */
@Injectable()
export class AccountService extends BaseProvider {
	/** @ignore */
	private readonly _UI_READY				= resolvable();

	/** @ignore */
	private readonly headerInternal			=
		new BehaviorSubject<string|{desktop?: string; mobile?: string}|User|undefined>(undefined)
	;

	/** @ignore */
	private readonly menuExpandedInternal	=
		new BehaviorSubject<boolean>(!this.envService.isMobile.value)
	;

	/** @ignore */
	private readonly mobileMenuOpenInternal	= new BehaviorSubject<boolean>(false);

	/** @ignore */
	private readonly transitionInternal		= new BehaviorSubject<boolean>(false);

	/** Active sidebar contact username. */
	public readonly activeSidebarContact	= new BehaviorSubject<string|undefined>(undefined);

	/** Header title for current section. */
	public readonly header: Observable<{desktop?: string; mobile?: string}|User|undefined>;

	/** Indicates whether real-time Docs is enabled. */
	public readonly enableDocs: boolean					=
		this.envService.debug || (
			!!this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.enableDocs === true
		)
	;

	/** Indicates whether Wallets is enabled. */
	public readonly enableWallets: boolean				=
		this.envService.debug || (
			!!this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.enableWallets === true
		)
	;

	/** Incoming call requests. */
	public readonly incomingCalls						= this.accountDatabaseService.getAsyncMap(
		'incomingCalls',
		NeverProto,
		SecurityModels.unprotected
	);

	/** Indicates the status of the interstitial. */
	public readonly interstitial						= new BehaviorSubject<boolean>(false);

	/** Indicates whether the UI is ready. */
	public readonly isUiReady							= new BehaviorSubject<boolean>(false);

	/** Maximum length of profile description. */
	public readonly maxDescriptionLength: number		= 1000;

	/** Maximum length of name. */
	public readonly maxNameLength: number				= 250;

	/** Indicates whether menu can be expanded. */
	public readonly menuExpandable: Observable<boolean>;

	/** Indicates whether menu is expanded. */
	public readonly menuExpanded: Observable<boolean>;

	/** Minimum expanded menu width. */
	public readonly menuExpandedMinWidth: number		= this.envService.isTelehealth ? 325 : 275;

	/** Minimum expanded menu width pixels string. */
	public readonly menuExpandedMinWidthPX: string		=
		`${this.menuExpandedMinWidth.toString()}px`
	;

	/** Menu width. */
	public readonly menuMaxWidth: Observable<string>;

	/** Menu minimum width. */
	public readonly menuMinWidth: number				= this.menuExpandedMinWidth * 2.5;

	/** Indicates whether simplified menu should be displayed. */
	public readonly menuReduced: Observable<boolean>	=
		this.windowWatcherService.width.pipe(map(width =>
			width <= this.configService.responsiveMaxWidths.xs
		))
	;

	/** Indicates whether mobile menu is open. */
	public readonly mobileMenuOpen: Observable<boolean>	= combineLatest(
		this.envService.isMobile,
		this.mobileMenuOpenInternal
	).pipe(map(([isMobile, mobileMenuOpen]) =>
		isMobile && mobileMenuOpen
	));

	/** Resolves ready promise. */
	public readonly resolveUiReady: () => void			= this._UI_READY.resolve;

	/** Route change listener. */
	public readonly routeChanges						= toBehaviorSubject<string>(
		this.router.events.pipe(
			filter(event => event instanceof NavigationEnd && event.url !== this.currentRoute),
			map(({url}: NavigationEnd) => url)
		),
		this.router.url,
		this.subscriptions
	);

	/** Root for account routes. */
	public readonly routeRoot: string					=
		accountRoot === '' ? '/' : `/${accountRoot}/`
	;

	/** Indicates when view is in transition. */
	public readonly transition: Observable<boolean>		= this.transitionInternal;

	/** Resolves after UI is ready. */
	public readonly uiReady: Promise<void>				= this._UI_READY.promise;

	/** Total count of unread messages. */
	public readonly unreadMessages: Observable<number>	= toBehaviorSubject(
		this.accountContactsService.contactList.pipe(
			mergeMap(users => observableAll(users.map(user => user.unreadMessageCount))),
			map(unreadCounts => unreadCounts.reduce((a, b) => a + b, 0))
		),
		0,
		this.subscriptions
	);

	/** @ignore */
	private get currentRoute () : string {
		return this.routeChanges.value;
	}

	/** Activated route data combined with that of child. */
	public combinedRouteData (activatedRoute: ActivatedRoute) : Observable<[
		Data,
		Params,
		UrlSegment[]
	]> {
		return this.routeChanges.pipe(
			mergeMap(() => combineLatest(
				activatedRoute.data,
				(activatedRoute.firstChild ? activatedRoute.firstChild.data : of({})),
				activatedRoute.params,
				(activatedRoute.firstChild ? activatedRoute.firstChild.params : of({})),
				activatedRoute.url,
				activatedRoute.firstChild ? activatedRoute.firstChild.url : of([])
			)),
			map(([data, childData, params, childParams, url, childURL]) : [
				Data,
				Params,
				UrlSegment[]
			] => [
				{...data, ...childData},
				{...params, ...childParams},
				[...url, ...childURL]
			])
		);
	}

	/** Contact form dialog. */
	public async contactFormDialog (to?: string) : Promise<void> {
		await this.dialogService.baseDialog(ContactComponent, async o => {
			if (to) {
				o.hideToDropdown	= true;
				o.to				= to;
			}

			if (!this.accountDatabaseService.currentUser.value) {
				return;
			}

			const [email, {name, realUsername}]	= await Promise.all([
				this.accountDatabaseService.getItem(
					'email',
					StringProto,
					SecurityModels.unprotected
				).catch(
					() => ''
				),
				this.accountDatabaseService.currentUser.value.user.accountUserProfile.getValue()
			]);

			o.fromEmail	= email;
			o.fromName	= name ? `${name} (@${realUsername})` : realUsername;
		});
	}

	/** Current route path. */
	public get routePath () : string[] {
		const route	= (
			this.activatedRoute.snapshot.firstChild &&
			this.activatedRoute.snapshot.firstChild.firstChild &&
			this.activatedRoute.snapshot.firstChild.firstChild.url.length > 0
		) ?
			this.activatedRoute.snapshot.firstChild.firstChild.url :
			undefined
		;

		return route ? route.map(o => o.path) : [];
	}

	/** Sets custom header text. */
	public setHeader (header: string|{desktop?: string; mobile?: string}|User) : void {
		this.headerInternal.next(header);
	}

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpandedInternal.next(typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpandedInternal.value
		);
	}

	/** Toggles mobile account menu. */
	public toggleMobileMenu (menuOpen?: boolean) : void {
		if (typeof menuOpen !== 'boolean') {
			menuOpen	= !this.mobileMenuOpenInternal.value;
		}

		if (menuOpen && this.envService.isWeb && !this.envService.isCordova) {
			history.pushState(undefined, '');
		}

		this.mobileMenuOpenInternal.next(menuOpen);
	}

	/** Triggers event to ends transition between components. */
	public async transitionEnd () : Promise<void> {
		await sleep(0);
		this.transitionInternal.next(false);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		super();

		if (this.envService.debugLog) {
			(<any> self).shareLogsWithCyph	= async () => {
				await this.interstitial.pipe(filter(b => !b), take(1)).toPromise();
				this.interstitial.next(true);

				await Promise.all([
					this.accountFilesService.upload(
						`${uuid()}.log`,
						{
							data: this.potassiumService.fromString(
								(<Record<string, any>[]> (<any> self).logs).map(o =>
									`${o.timestamp}${o.error ? ' (error)' : ''}: ${
										o.argsCopy !== undefined ?
											prettyPrint(o.argsCopy) :
											stringify({keys: Object.keys(o.args)})
									}`
								).join('\n\n\n\n') + '\n'
							),
							mediaType: 'text/plain',
							name: ''
						},
						'cyph'
					),
					sleep(1000)
				]);

				this.interstitial.next(false);
			};
		}

		if (this.envService.isWeb && !this.envService.isCordova) {
			self.addEventListener('popstate', () => {
				this.mobileMenuOpenInternal.next(false);
			});
		}

		if (this.envService.isWeb && this.envService.isMobileOS) {
			new Hammer(document.body).on('panleft', () => {
				if (
					this.accountDatabaseService.currentUser.value === undefined ||
					this.windowWatcherService.width.value >
						this.configService.responsiveMaxWidths.sm
				) {
					return;
				}

				if (this.mobileMenuOpenInternal.value) {
					this.mobileMenuOpenInternal.next(false);

					if (!this.envService.isCordova) {
						history.back();
					}
				}
			});

			new Hammer(document.body, {recognizers: [
				[
					Hammer.Pan,
					{direction: Hammer.DIRECTION_RIGHT, threshold: 4}
				]
			]}).on('pan', e => {
				if (
					this.accountDatabaseService.currentUser.value === undefined ||
					this.windowWatcherService.width.value >
						this.configService.responsiveMaxWidths.sm
				) {
					return;
				}

				if (e.center.x < 72 && e.deltaX > 8 && e.deltaY < 4) {
					this.toggleMobileMenu(true);
				}
			});
		}

		this.header	= combineLatest(
			this.activeSidebarContact,
			this.headerInternal,
			this.envService.isMobile,
			this.transitionInternal
		).pipe(
			map(([activeSidebarContact, header, isMobile, _]) => {
				const routePath	= this.routePath;
				const route		= routePath[0];

				const specialCases: {[k: string]: string}	= {
					ehr: 'EHR'
				};

				/* Avoid redundancy between header and sidebar */
				if (header instanceof User && header.username === activeSidebarContact) {
					header	= undefined;
				}

				/* Special case: set root header on mobile */
				if (!route && isMobile) {
					return this.envService.isTelehealth ?
						this.stringsService.profileHeader :
						this.stringsService.messagesHeader
					;
				}

				/* No header */
				if (
					[
						'register'
					].indexOf(route) > -1 ||
					(
						[
							'appointments',
							'audio',
							'call',
							'video'
						].indexOf(route) > -1 &&
						routePath.length > 1 &&
						routePath[1] !== 'end'
					)
				) {
					return undefined;
				}

				/* No header until explicitly set via accountService.setHeader */
				if (
					[
						'mail',
						'messages',
						'profile'
					].indexOf(route) > -1 &&
					(
						routePath.length > 1
					)
				) {
					/* Always make at least an empty string on mobile to ensure menu bar displays */
					return isMobile ? (header || '') : header;
				}

				/*
					No header by default for non-whitelisted sections,
					or deep routes of non-whitelisted sections
				*/
				if (
					[
						'404',
						'appointments',
						'contacts',
						'docs',
						'doctors',
						'ehr-access',
						'files',
						'forms',
						'incoming-patient-info',
						'notes',
						'patients',
						'settings',
						'staff',
						'wallets'
					].indexOf(route) < 0 || (
						[
							'docs',
							'ehr-access',
							'files',
							'forms',
							'incoming-patient-info',
							'notes',
							'settings',
							'wallets'
						].indexOf(route) < 0 &&
						routePath.length > 1
					)
				) {
					/* Always make at least an empty string on mobile to ensure menu bar displays */
					return isMobile ? (header || '') : undefined;
				}

				return header || translate(route.
					split('-').
					map(s => specialCases[s] || (s[0].toUpperCase() + s.slice(1))).
					join(' ')
				);
			}),
			map(header =>
				typeof header === 'string' ? {desktop: header, mobile: header} : header
			)
		);

		this.menuExpandable	= combineLatest(
			this.menuReduced,
			this.windowWatcherService.width
		).pipe(map(([menuReduced, width]) =>
			!menuReduced && width >= this.menuMinWidth
		));

		this.menuExpanded	= combineLatest(
			this.menuExpandedInternal,
			this.menuExpandable,
			this.mobileMenuOpen,
			this.windowWatcherService.width
		).pipe(map(([menuExpandedInternal, menuExpandable, mobileMenuOpen, width]) =>
			mobileMenuOpen || (
				menuExpandedInternal &&
				menuExpandable &&
				width > this.configService.responsiveMaxWidths.xs
			)
		));

		this.menuMaxWidth	= combineLatest(
			this.menuExpanded,
			this.windowWatcherService.width
		).pipe(map(([menuExpanded, width]) =>
			width <= this.configService.responsiveMaxWidths.xs ?
				'100%' :
				!menuExpanded ?
					'6em' :
					this.menuMinWidth > width ?
						'100%' :
						this.menuExpandedMinWidthPX
		));


		const respondedCallRequests	= new Set<string>();

		this.subscriptions.push(this.incomingCalls.watchKeys().subscribe(async keys => {
			for (const k of keys) {
				if (respondedCallRequests.has(k)) {
					continue;
				}

				try {
					const [callType, username, id, expiresString]	= k.split('_');
					const expires	= toInt(expiresString);
					const timestamp	= await getTimestamp();


					if (
						(callType !== 'audio' && callType !== 'video') ||
						!username ||
						!id ||
						isNaN(expires) ||
						timestamp >= expires
					) {
						continue;
					}

					const user	= await this.accountUserLookupService.getUser(username);
					if (!user) {
						continue;
					}

					const {name, realUsername}	= await user.accountUserProfile.getValue();

					const answered	= await this.dialogService.confirm({
						bottomSheet: true,
						cancel: this.stringsService.decline,
						cancelFAB: 'close',
						content: `${name} (@${realUsername})`,
						fabAvatar: user.avatar,
						ok: this.stringsService.answer,
						okFAB: 'phone',
						timeout: expires - timestamp,
						title: callType === 'audio' ?
							this.stringsService.incomingCallAudio :
							this.stringsService.incomingCallVideo
					});

					if (answered) {
						this.router.navigate([
							accountRoot,
							callType,
							await user.contactID,
							id,
							expiresString
						]);
					}
				}
				catch {}
				finally {
					respondedCallRequests.add(k);
					this.incomingCalls.removeItem(k).catch(() => {});
				}
			}
		}));


		let lastSection	= '';
		let lastURL		= '';

		this.subscriptions.push(this.router.events.subscribe(e => {
			if (!(e instanceof NavigationStart)) {
				return;
			}

			if (e.url !== lastURL) {
				lastURL	= e.url;
				this.headerInternal.next(undefined);
			}

			let section	= (e.url.match(/^account\/(.*?)(\/|$).*/) || [])[1] || '';

			if (section === 'search') {
				section	= '';
			}

			if (section !== lastSection) {
				lastSection	= section;
				this.transitionInternal.next(true);
			}
		}));

		this.uiReady.then(() => {
			this.isUiReady.next(true);
		});
	}
}
