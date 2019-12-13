/* eslint-disable max-lines */

import {Injectable, NgZone} from '@angular/core';
import {
	ActivatedRoute,
	Data,
	NavigationEnd,
	Params,
	Router,
	UrlSegment
} from '@angular/router';
import * as Hammer from 'hammerjs';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {filter, map, mergeMap, skip, take} from 'rxjs/operators';
import {SecurityModels, User} from '../account';
import {BaseProvider} from '../base-provider';
import {ContactComponent} from '../components/contact';
import {IResolvable} from '../iresolvable';
import {
	BooleanProto,
	CyphPlans,
	NeverProto,
	NotificationTypes,
	StringProto
} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {toInt} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {observableAll} from '../util/observable-all';
import {prettyPrint, stringify} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {translate} from '../util/translate';
import {uuid} from '../util/uuid';
import {resolvable, sleep} from '../util/wait';
import {AccountAppointmentsService} from './account-appointments.service';
import {AccountContactsService} from './account-contacts.service';
import {AccountFilesService} from './account-files.service';
import {AccountSettingsService} from './account-settings.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {ConfigService} from './config.service';
import {AccountAuthService} from './crypto/account-auth.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {FingerprintService} from './fingerprint.service';
import {NotificationService} from './notification.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {StringsService} from './strings.service';
import {WindowWatcherService} from './window-watcher.service';

/**
 * Account service.
 */
@Injectable()
export class AccountService extends BaseProvider {
	/** @ignore */
	private readonly _UI_READY = resolvable();

	/** @ignore */
	private readonly chatBlurReloadTimeout = 60000;

	/** @ignore */
	private readonly headerInternal = new BehaviorSubject<
		string | {desktop?: string; mobile?: string} | User | undefined
	>(undefined);

	/** @ignore */
	private readonly incomingCallAnswers = new Map<
		string,
		IResolvable<boolean>
	>();

	/** @ignore */
	private readonly menuExpandedInternal = new BehaviorSubject<boolean>(
		!this.envService.isMobile.value
	);

	/** @ignore */
	private readonly mobileMenuOpenInternal = new BehaviorSubject<boolean>(
		false
	);

	/** @ignore */
	private readonly respondedCallRequests = new Set<string>();

	/** @ignore */
	private readonly transitionInternal = new BehaviorSubject<boolean>(false);

	/** Indicates whether real-time Docs is enabled. */
	public readonly enableDocs: Observable<boolean> = of(
		this.envService.debug ||
			(!!this.envService.environment.customBuild &&
				this.envService.environment.customBuild.config.enableDocs ===
					true)
	);

	/** Indicates whether Passwords is enabled. */
	public readonly enablePasswords: Observable<boolean> = this.envService
		.debug ?
		of(true) :
		this.accountSettingsService.plan.pipe(
			map(plan => plan === CyphPlans.FoundersAndFriends)
		);

	/** Indicates whether Wallets is enabled. */
	public readonly enableWallets: Observable<boolean> =
		this.envService.debug ||
		(!!this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.enableWallets ===
				true) ?
			of(true) :
			this.accountSettingsService.plan.pipe(
				map(plan => plan === CyphPlans.FoundersAndFriends)
			);

	/** Email address to use for new pseudo-account. */
	public readonly fromEmail = new BehaviorSubject<string>('');

	/** `fromEmail` autocomplete options. */
	public readonly fromEmailOptions = combineLatest([
		this.accountAppointmentsService.pastEmailContacts,
		this.fromEmail
	]).pipe(
		map(([options, email]) => {
			email = email.trim().toLowerCase();
			return options.filter(option => option.email.startsWith(email));
		})
	);

	/** Name to use for new pseudo-account. */
	public readonly fromName = new BehaviorSubject<string>('');

	/** `fromName` autocomplete options. */
	public readonly fromNameOptions = combineLatest([
		this.accountAppointmentsService.pastEmailContacts,
		this.fromName
	]).pipe(
		map(([options, name]) => {
			name = name.trim().toLowerCase();
			return options.filter(option =>
				option.name.toLowerCase().startsWith(name)
			);
		})
	);

	/** Header title for current section. */
	public readonly header: Observable<
		{desktop?: string; mobile?: string} | User | undefined
	>;

	/** Indicates the status of the interstitial. */
	public readonly interstitial = new BehaviorSubject<boolean>(false);

	/** Indicates whether a call is currently in progress. */
	public readonly isCallActive = new BehaviorSubject<boolean>(false);

	/** Indicates whether the UI is ready. */
	public readonly isUiReady = new BehaviorSubject<boolean>(false);

	/** Maximum length of profile description. */
	public readonly maxDescriptionLength: number = 1000;

	/** Maximum length of name. */
	public readonly maxNameLength: number = 250;

	/** Indicates whether menu can be expanded. */
	public readonly menuExpandable: Observable<boolean>;

	/** Indicates whether menu is expanded. */
	public readonly menuExpanded: Observable<boolean>;

	/** Minimum expanded menu width. */
	public readonly menuExpandedMinWidth: number = this.envService
		.isTelehealthFull ?
		325 :
		275;

	/** Minimum expanded menu width pixels string. */
	public readonly menuExpandedMinWidthPX: string = `${this.menuExpandedMinWidth.toString()}px`;

	/** Menu width. */
	public readonly menuMaxWidth: Observable<string>;

	/** Menu minimum width. */
	public readonly menuMinWidth: number = this.menuExpandedMinWidth * 2.5;

	/** Indicates whether simplified menu should be displayed. */
	public readonly menuReduced: Observable<
		boolean
	> = this.windowWatcherService.width.pipe(
		map(width => width <= this.configService.responsiveMaxWidths.xs)
	);

	/** Indicates whether mobile menu is open. */
	public readonly mobileMenuOpen: Observable<boolean> = combineLatest([
		this.envService.isMobile,
		this.mobileMenuOpenInternal
	]).pipe(map(([isMobile, mobileMenuOpen]) => isMobile && mobileMenuOpen));

	/** Resolves ready promise. */
	public readonly resolveUiReady: () => void = this._UI_READY.resolve;

	/** Route change listener. */
	public readonly routeChanges = toBehaviorSubject<string>(
		this.router.events.pipe(
			filter(
				event =>
					event instanceof NavigationEnd &&
					event.url !== this.currentRoute
			),
			map(({url}: any) => url)
		),
		this.router.url,
		this.subscriptions
	);

	/** Indicates when view is in transition. */
	public readonly transition: Observable<boolean> = this.transitionInternal;

	/** Resolves after UI is ready. */
	public readonly uiReady: Promise<void> = this._UI_READY.promise;

	/** Total count of unread messages. */
	public readonly unreadMessages: Observable<number> = toBehaviorSubject(
		this.accountContactsService.contactList.pipe(
			mergeMap(users =>
				observableAll(users.map(user => user.unreadMessageCount))
			),
			map(unreadCounts => unreadCounts.reduce((a, b) => a + b, 0))
		),
		0,
		this.subscriptions
	);

	/** @ignore */
	private async getIncomingCallRoute (
		callMetadata: string
	) : Promise<{
		callType: string;
		expires: number;
		id: string;
		route: string[];
		timestamp: number;
		user: User;
	}> {
		const [callType, username, id, expiresString] = callMetadata.split(',');
		const expires = toInt(expiresString);
		const timestamp = await getTimestamp();

		if (
			(callType !== 'audio' && callType !== 'video') ||
			!username ||
			!id ||
			isNaN(expires) ||
			timestamp >= expires
		) {
			throw new Error('Expired call.');
		}

		const user = await this.accountUserLookupService.getUser(username);
		if (!user) {
			throw new Error('User not found.');
		}

		const contactID = await user.contactID;

		return {
			callType,
			expires,
			id,
			route: [callType, contactID, id, expiresString],
			timestamp,
			user
		};
	}

	/** @ignore */
	private get currentRoute () : string {
		return this.routeChanges.value;
	}

	/** Activated route data combined with that of child. */
	public combinedRouteData (
		activatedRoute: ActivatedRoute
	) : Observable<[Data, Params, UrlSegment[]]> {
		return this.routeChanges.pipe(
			mergeMap(() =>
				combineLatest([
					activatedRoute.data,
					activatedRoute.firstChild ?
						activatedRoute.firstChild.data :
						of({}),
					activatedRoute.params,
					activatedRoute.firstChild ?
						activatedRoute.firstChild.params :
						of({}),
					activatedRoute.url,
					activatedRoute.firstChild ?
						activatedRoute.firstChild.url :
						of([])
				])
			),
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
				o.hideToDropdown = true;
				o.to = to;
			}

			if (!this.accountDatabaseService.currentUser.value) {
				return;
			}

			const [email, {name, realUsername}] = await Promise.all([
				this.accountDatabaseService
					.getItem('email', StringProto, SecurityModels.unprotected)
					.catch(() => ''),
				this.accountDatabaseService.currentUser.value.user.accountUserProfile.getValue()
			]);

			o.fromEmail = email;
			o.fromName = name ? `${name} (@${realUsername})` : realUsername;
		});
	}

	/** Current route path. */
	public get routePath () : string[] {
		const route =
			this.activatedRoute.snapshot.firstChild &&
			this.activatedRoute.snapshot.firstChild.firstChild &&
			this.activatedRoute.snapshot.firstChild.firstChild.url.length > 0 ?
				this.activatedRoute.snapshot.firstChild.firstChild.url :
				undefined;

		return route ? route.map(o => o.path) : [];
	}

	/** Sets custom header text. */
	public setHeader (
		header: string | {desktop?: string; mobile?: string} | User
	) : void {
		this.headerInternal.next(header);
	}

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		menuExpanded =
			typeof menuExpanded === 'boolean' ?
				menuExpanded :
				!this.menuExpandedInternal.value;

		this.menuExpandedInternal.next(menuExpanded);
		this.localStorageService.setItem(
			'AccountService.menuExpanded',
			BooleanProto,
			menuExpanded
		);
	}

	/** Toggles mobile account menu. */
	public toggleMobileMenu (menuOpen?: boolean) : void {
		if (typeof menuOpen !== 'boolean') {
			menuOpen = !this.mobileMenuOpenInternal.value;
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

	/** Runs on user login. */
	public async userInit () : Promise<void> {
		await this.accountDatabaseService.currentUserFiltered
			.pipe(take(1))
			.toPromise();

		(async () => {
			const fingerprintAuthSupported = await this.fingerprintService
				.supported;

			let windowBlurred: number | undefined;

			this.subscriptions.push(
				this.windowWatcherService.visibility
					.pipe(skip(1))
					.subscribe(async visible =>
						this.ngZone.run(async () => {
							if (!visible) {
								windowBlurred = await getTimestamp();
								return;
							}

							if (fingerprintAuthSupported) {
								document.body.classList.add('soft-lock');
							}

							const {url} = this.router;

							const chatReloadPromise =
								(url.startsWith('mail/') ||
									url.startsWith('messages/')) &&
								windowBlurred !== undefined &&
								(await getTimestamp()) - windowBlurred >
									this.chatBlurReloadTimeout ?
									this.router
										.navigate(['transition'], {
											skipLocationChange: true
										})
										.then(async () =>
											this.router.navigate(url.split('/'))
										) :
									Promise.resolve();

							if (!fingerprintAuthSupported) {
								await chatReloadPromise;
								return;
							}

							if (await this.fingerprintService.authenticate()) {
								await chatReloadPromise;
								document.body.classList.remove('soft-lock');
								return;
							}

							await this.accountAuthService.lock();
						})
					)
			);
		})();

		this.subscriptions.push(
			this.accountSettingsService.plan
				.pipe(map(plan => plan > CyphPlans.Free))
				.subscribe(this.envService.pro)
		);

		if (!P2PWebRTCService.isSupported) {
			return;
		}

		const incomingCalls = this.accountDatabaseService.getAsyncMap(
			'incomingCalls',
			NeverProto,
			SecurityModels.unprotected,
			undefined,
			undefined,
			undefined,
			this.subscriptions
		);

		this.subscriptions.push(
			incomingCalls.watchKeys().subscribe(async keys => {
				for (const k of keys) {
					if (this.respondedCallRequests.has(k)) {
						continue;
					}

					try {
						const {
							callType,
							expires,
							route,
							user
						} = await this.getIncomingCallRoute(k);

						const {
							name,
							realUsername
						} = await user.accountUserProfile.getValue();

						const incomingCallAnswer = getOrSetDefault(
							this.incomingCallAnswers,
							k,
							/* eslint-disable-next-line @typescript-eslint/tslint/config */
							() => resolvable<boolean>()
						);

						const dialogClose = resolvable<() => void>();

						const answered =
							typeof incomingCallAnswer.value === 'boolean' ?
								incomingCallAnswer.value :
								await this.notificationService.ring(async () =>
									Promise.race([
										incomingCallAnswer.promise,
										this.dialogService.confirm(
											{
												bottomSheet: true,
												cancel: this.stringsService
													.decline,
												cancelFAB: 'close',
												content: `${name} (@${realUsername})`,
												fabAvatar: user.avatar,
												ok: this.stringsService.answer,
												okFAB: 'phone',
												timeout:
													expires -
													(await getTimestamp()),
												title:
													callType === 'audio' ?
														this.stringsService
															.incomingCallAudio :
														this.stringsService
															.incomingCallVideo
											},
											dialogClose
										)
									])
								);

						(await dialogClose.promise)();

						if (answered) {
							this.router.navigate(route);
						}
					}
					catch {
					}
					finally {
						this.respondedCallRequests.add(k);
					}
				}

				try {
					await Promise.all(
						keys.map(async k => incomingCalls.removeItem(k))
					);
				}
				catch {}
			})
		);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly ngZone: NgZone,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountAppointmentsService: AccountAppointmentsService,

		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly accountSettingsService: AccountSettingsService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly fingerprintService: FingerprintService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly notificationService: NotificationService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		super();

		(<any> self).shareLogsWithCyph = async () => {
			await this.interstitial
				.pipe(
					filter(b => !b),
					take(1)
				)
				.toPromise();
			this.interstitial.next(true);

			await Promise.all([
				this.accountFilesService.upload(
					`${uuid()}.log`,
					{
						data: this.potassiumService.fromString(
							[
								(await envService.packageName) + '\n---',
								...(<Record<string, any>[]> (
									(<any> self).logs
								)).map(
									o =>
										`${o.timestamp}${
											o.error ? ' (error)' : ''
										}: ${
											o.argsCopy !== undefined ?
												prettyPrint(o.argsCopy) :
												stringify({
													keys: Object.keys(o.args)
												})
										}`
								)
							].join('\n\n\n\n') + '\n'
						),
						mediaType: 'text/plain',
						name: ''
					},
					'cyph'
				).result,
				sleep(1000)
			]);

			this.interstitial.next(false);
		};

		this.localStorageService
			.getItem('AccountService.menuExpanded', BooleanProto)
			.then(menuExpanded => {
				this.menuExpandedInternal.next(menuExpanded);
			})
			.catch(() => {});

		this.userInit();

		if (this.envService.isWeb && !this.envService.isCordova) {
			self.addEventListener('popstate', () => {
				this.mobileMenuOpenInternal.next(false);
			});
		}

		if (this.envService.isWeb && this.envService.isMobileOS) {
			new Hammer(document.body).on('panleft', e => {
				if (
					Math.abs(e.deltaY) >= 4 ||
					!this.mobileMenuOpenInternal.value ||
					this.accountDatabaseService.currentUser.value ===
						undefined ||
					this.windowWatcherService.width.value >
						this.configService.responsiveMaxWidths.sm
				) {
					return;
				}

				this.mobileMenuOpenInternal.next(false);

				if (!this.envService.isCordova) {
					history.back();
				}
			});

			new Hammer(document.body, {
				recognizers: [
					[
						Hammer.Pan,
						{direction: Hammer.DIRECTION_RIGHT, threshold: 4}
					]
				]
			}).on('pan', e => {
				if (
					this.accountDatabaseService.currentUser.value ===
						undefined ||
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

		this.accountDatabaseService.pushNotificationsSubscribe(async data => {
			const notificationType = toInt(
				data?.additionalData?.notificationType
			);

			if (
				data?.additionalData?.dismissed ||
				!(notificationType in NotificationTypes) ||
				typeof data?.additionalData?.notificationID !== 'string'
			) {
				return;
			}

			switch (notificationType) {
				case NotificationTypes.File:
					const {recordType} = await this.accountFilesService.getFile(
						data.additionalData.notificationID
					);

					this.router.navigate([
						this.accountFilesService.config[recordType].route
					]);
					break;

				case NotificationTypes.Message:
					if (
						typeof data?.additionalData?.senderUsername !==
							'string' ||
						(this.headerInternal.value instanceof User &&
							this.headerInternal.value.username ===
								data.additionalData.senderUsername &&
							this.router.url.startsWith('/messages/'))
					) {
						return;
					}

					this.router.navigate([
						'messages',
						'user',
						data.additionalData.senderUsername
					]);
			}
		});

		for (const [callEvent, callAnswer] of <[string, boolean][]> [
			['callAccept', true],
			['callReject', false]
		]) {
			this.accountDatabaseService.pushNotificationsSubscribe(
				callEvent,
				async data => {
					if (
						typeof data?.additionalData?.callMetadata !== 'string'
					) {
						return;
					}

					this.respondedCallRequests.add(
						data.additionalData.callMetadata
					);

					getOrSetDefault(
						this.incomingCallAnswers,
						data.additionalData.callMetadata,
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						() => resolvable<boolean>()
					).resolve(callAnswer);

					if (!callAnswer) {
						return;
					}

					try {
						const {route} = await this.getIncomingCallRoute(
							data.additionalData.callMetadata
						);

						await this.router.navigate(route);
					}
					catch {
						await this.dialogService.toast(
							this.stringsService.p2pTimeoutIncoming,
							3000
						);
					}
				}
			);
		}

		this.accountDatabaseService.pushNotificationsSubscribe(
			'callBack',
			data => {
				if (typeof data?.additionalData?.senderUsername !== 'string') {
					return;
				}

				this.router.navigate([
					'call',
					'user',
					data.additionalData.senderUsername
				]);
			}
		);

		this.header = combineLatest([
			this.headerInternal,
			this.envService.isMobile,
			this.transitionInternal
		]).pipe(
			/* eslint-disable-next-line complexity */
			map(([header, isMobile, _]) => {
				const routePath = this.routePath;
				const route = routePath[0];

				const specialCases: {[k: string]: string} = {
					ehr: 'EHR',
					inbox: 'Anonymous Inbox'
				};

				/* User headers on desktop are redundant with sidebar */
				if (header instanceof User && !isMobile) {
					header = undefined;
				}

				/* Special case: set root header on mobile */
				if (!route && isMobile) {
					return this.envService.isTelehealthFull ?
						this.stringsService.profileHeader :
					this.envService.isTelehealth ?
						this.stringsService.productTelehealth :
						this.stringsService.messagesHeader;
				}

				/* No header */
				if (
					['register'].indexOf(route) > -1 ||
					([
						'account-burner',
						'appointments',
						'audio',
						'call',
						'video'
					].indexOf(route) > -1 &&
						routePath.length > 1 &&
						['end', 'forms'].indexOf(routePath[1]) > -1)
				) {
					return undefined;
				}

				/* No header until explicitly set via accountService.setHeader */
				if (
					['mail', 'messages', 'profile'].indexOf(route) > -1 &&
					routePath.length > 1 &&
					!(routePath[0] === 'profile' && routePath[1] === 'edit')
				) {
					/* Always make at least an empty string on mobile to ensure menu bar displays */
					return isMobile ? header || '' : header;
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
						'inbox',
						'incoming-patient-info',
						'notes',
						'passwords',
						'patients',
						'settings',
						'staff',
						'wallets',
						'welcome'
					].indexOf(route) < 0 ||
					([
						'appointments',
						'docs',
						'ehr-access',
						'files',
						'forms',
						'inbox',
						'incoming-patient-info',
						'notes',
						'passwords',
						'settings',
						'wallets'
					].indexOf(route) < 0 &&
						routePath.length > 1)
				) {
					/* Always make at least an empty string on mobile to ensure menu bar displays */
					return isMobile ? header || '' : undefined;
				}

				return (
					header ||
					translate(
						route
							.split('-')
							.map(
								s =>
									specialCases[s] ||
									s[0].toUpperCase() + s.slice(1)
							)
							.join(' ')
					)
				);
			}),
			map(header =>
				typeof header === 'string' ?
					{desktop: header, mobile: header} :
					header
			)
		);

		this.menuExpandable = combineLatest([
			this.menuReduced,
			this.windowWatcherService.width
		]).pipe(
			map(
				([menuReduced, width]) =>
					!menuReduced && width >= this.menuMinWidth
			)
		);

		this.menuExpanded = combineLatest([
			this.menuExpandedInternal,
			this.menuExpandable,
			this.mobileMenuOpen,
			this.windowWatcherService.width
		]).pipe(
			map(
				([
					menuExpandedInternal,
					menuExpandable,
					mobileMenuOpen,
					width
				]) =>
					mobileMenuOpen ||
					(menuExpandedInternal &&
						menuExpandable &&
						width > this.configService.responsiveMaxWidths.xs)
			)
		);

		this.menuMaxWidth = combineLatest([
			this.menuExpanded,
			this.windowWatcherService.width
		]).pipe(
			map(([menuExpanded, width]) =>
				width <= this.configService.responsiveMaxWidths.xs ?
					'100%' :
				!menuExpanded ?
					'6em' :
				this.menuMinWidth > width ?
					'100%' :
					this.menuExpandedMinWidthPX
			)
		);

		let lastSection = '';
		let lastURL = '';

		this.subscriptions.push(
			this.router.events.subscribe(e => {
				if (!(e instanceof NavigationEnd)) {
					return;
				}

				const urlSplit = e.urlAfterRedirects.split('/');
				const newURL = urlSplit.slice(0, 2).join('/');
				const section = (urlSplit[0] !== 'search' && urlSplit[0]) || '';

				if (newURL === 'transition') {
					return;
				}

				if (newURL !== lastURL) {
					lastURL = newURL;
					this.headerInternal.next(undefined);
				}

				if (section !== lastSection) {
					lastSection = section;
					this.transitionInternal.next(true);
				}
			})
		);

		this.uiReady.then(() => {
			this.isUiReady.next(true);
		});
	}
}
