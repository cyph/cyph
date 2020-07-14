/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {
	ActivatedRoute,
	Data,
	NavigationEnd,
	Params,
	Router,
	UrlSegment
} from '@angular/router';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {filter, map, skip, switchMap} from 'rxjs/operators';
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
import {normalize, normalizeArray, toInt} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {lockFunction} from '../util/lock';
import {observableAll} from '../util/observable-all';
import {arraySum} from '../util/reducers';
import {request} from '../util/request';
import {getTimestamp, watchDateChange} from '../util/time';
import {translate} from '../util/translate';
import {resolvable, retryUntilSuccessful, sleep} from '../util/wait';
import {openWindow, reloadWindow} from '../util/window';
import {AccountAppointmentsService} from './account-appointments.service';
import {AccountContactsService} from './account-contacts.service';
import {AccountFilesService} from './account-files.service';
import {AccountSettingsService} from './account-settings.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {ConfigService} from './config.service';
import {AccountAuthService} from './crypto/account-auth.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {FingerprintService} from './fingerprint.service';
import {NotificationService} from './notification.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {SalesService} from './sales.service';
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
	private readonly accountGoodStandingLock = lockFunction();

	/** @ignore */
	private readonly headerInternal = new BehaviorSubject<{
		contextMenuActions?: {
			handler: (e: MouseEvent) => void;
			icon: string;
			label: string;
		}[];
		header?: string | {desktop?: string; mobile?: string; user?: User};
	}>({});

	/** @ignore */
	private readonly incomingCallAnswers = new Map<
		string,
		IResolvable<boolean>
	>();

	/** @ignore */
	private lastUserToken?: {expires: number; token: string};

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

	/** Indicates whether account is in good standing. */
	public readonly accountGoodStanding = new BehaviorSubject<boolean>(true);

	/** Indicates whether automatic updates should be applied. */
	public readonly autoUpdate = new BehaviorSubject<boolean>(true);

	/** Email address to use for new pseudo-account. */
	public readonly fromEmail = new BehaviorSubject<string>('');

	/** `fromEmail` autocomplete options. */
	public readonly fromEmailOptions = observableAll([
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
	public readonly fromNameOptions = observableAll([
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

	/** Indicates whether current user has unlimited invites. */
	public readonly hasUnlimitedInvites: Observable<
		boolean
	> = this.accountSettingsService.plan.pipe(
		map(
			plan =>
				this.configService.planConfig[plan].initialInvites === undefined
		)
	);

	/** Header title for current section. */
	public readonly header: Observable<{
		contextMenuActions?: {
			handler: (e: MouseEvent) => void;
			icon: string;
			label: string;
		}[];
		header?: {desktop?: string; mobile?: string; user?: User};
	}>;

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
	public readonly mobileMenuOpen: Observable<boolean> = observableAll([
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
	public readonly uiReady: Promise<void> = this._UI_READY;

	/** Total count of unread messages. */
	public readonly unreadMessages: Observable<number> = toBehaviorSubject(
		this.accountContactsService.contactList.pipe(
			switchMap(users =>
				observableAll(users.map(user => user.unreadMessageCount))
			),
			map(arraySum)
		),
		0,
		this.subscriptions
	);

	/** @see SalesService.upsellBanner */
	public readonly upsellBanner = observableAll([
		this.salesService.upsellBanner,
		this.accountDatabaseService.currentUser
	]).pipe(
		map(
			([upsellBanner, currentUser]) =>
				upsellBanner && currentUser?.masterKeyConfirmed === true
		)
	);

	/** @ignore */
	private async getIncomingCallRoute (
		callMetadata: string
	) : Promise<{
		callType: 'audio' | 'chat' | 'video';
		expires: number;
		id: string;
		groupID: string;
		route: string[];
		timestamp: number;
		user: User | undefined;
	}> {
		const [
			callType,
			username,
			groupID,
			id,
			expiresString
		] = callMetadata.split(',');
		const expires = toInt(expiresString);
		const timestamp = await getTimestamp();

		if (
			(callType !== 'audio' &&
				callType !== 'chat' &&
				callType !== 'video') ||
			!id ||
			isNaN(expires) ||
			timestamp >= expires
		) {
			throw new Error('Expired call.');
		}

		const user = await this.accountUserLookupService.getUser(username);

		/* Anonymous "calls" allowed only for chats */
		if (!user && callType !== 'chat') {
			throw new Error('User not found.');
		}

		if (groupID) {
			const chatData = await this.accountContactsService.getChatData(
				groupID
			);

			if (
				!(
					'group' in chatData &&
					normalizeArray(chatData.group.usernames || []).indexOf(
						username
					) > -1
				)
			) {
				throw new Error('Invalid group ID.');
			}
		}

		const contactID = groupID || (await user?.contactID) || '';

		return {
			callType,
			expires,
			groupID,
			id,
			route:
				callType === 'chat' ?
					['account-burner', 'chat', id] :
					[callType, contactID, id, expiresString],
			timestamp,
			user
		};
	}

	/** @ignore */
	private get currentRoute () : string {
		return this.routeChanges.value;
	}

	/** @ignore */
	private async updateAccountGoodStanding (
		onlyIfFalse: boolean = false
	) : Promise<void> {
		await this.accountGoodStandingLock(async () => {
			if (onlyIfFalse && this.accountGoodStanding.value) {
				return;
			}

			const userToken = await this.getUserToken();

			this.accountGoodStanding.next(
				!userToken ?
					true :
					(await request({
						retries: 5,
						url:
							this.envService.baseUrl +
							`accountstanding/${userToken}`
					}).catch(() => 'true')) === 'true'
			);
		});
	}

	/** Activated route data combined with that of child. */
	public combinedRouteData (
		activatedRoute: ActivatedRoute
	) : Observable<[Data, Params, UrlSegment[]]> {
		return this.routeChanges.pipe(
			switchMap(() =>
				observableAll([
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

	/** Downgrades account to free plan. */
	public async downgradeAccount () : Promise<void> {
		if (
			!(await this.dialogService.confirm({
				content: this.stringsService.downgradeAccountPrompt,
				title: this.stringsService.downgradeAccountTitle
			}))
		) {
			return;
		}

		this.interstitial.next(true);
		try {
			const userToken = await this.getUserToken();
			if (!userToken) {
				return;
			}

			await request({
				retries: 5,
				url: this.envService.baseUrl + `downgradeaccount/${userToken}`
			});
		}
		finally {
			this.interstitial.next(false);
		}
	}

	/** Auth token for current user. */
	public async getUserToken (
		spinner?: BehaviorSubject<boolean>
	) : Promise<string | undefined> {
		if (
			this.lastUserToken &&
			this.lastUserToken.expires > (await getTimestamp())
		) {
			return this.lastUserToken.token;
		}

		await this.accountDatabaseService.getCurrentUser();

		/* Don't interfere if spinner is already running */
		if (spinner?.value) {
			spinner = undefined;
		}

		/* eslint-disable-next-line no-unused-expressions */
		spinner?.next(true);

		this.lastUserToken = await retryUntilSuccessful(
			async () => {
				const {
					expires,
					token
				} = await this.accountDatabaseService.callFunction(
					'getUserToken'
				);

				if (
					typeof token !== 'string' ||
					typeof expires !== 'number' ||
					isNaN(expires) ||
					(await getTimestamp()) >= expires
				) {
					throw new Error('Invalid user token.');
				}

				return {expires, token};
			},
			10,
			30000
		).catch(() => undefined);

		/* eslint-disable-next-line no-unused-expressions */
		spinner?.next(false);

		return this.lastUserToken?.token;
	}

	/** Current route path. */
	public get routePath () : string[] {
		const route =
			this.activatedRoute.snapshot.firstChild?.firstChild &&
			this.activatedRoute.snapshot.firstChild.firstChild.url.length > 0 ?
				this.activatedRoute.snapshot.firstChild.firstChild.url :
				undefined;

		return route ? route.map(o => o.path) : [];
	}

	/** Sets custom header text. */
	public setHeader (
		header: string | {desktop?: string; mobile?: string} | User,
		contextMenuActions?: {
			handler: (e: MouseEvent) => void;
			icon: string;
			label: string;
		}[]
	) : void {
		this.headerInternal.next({
			contextMenuActions,
			header: header instanceof User ? {user: header} : header
		});
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
		await this.accountDatabaseService.getCurrentUser();

		this.subscriptions.push(
			this.windowWatcherService.visibility
				.pipe(skip(1))
				.subscribe(async visible => {
					if (!visible) {
						return;
					}

					/* Check for updates to keep long-running background instances in sync */
					try {
						const packageTimestamp =
							!this.envService.isLocalEnv &&
							this.autoUpdate.value ?
								/* eslint-disable-next-line @typescript-eslint/tslint/config */
								localStorage.getItem(
									'webSignPackageTimestamp'
								) :
								undefined;

						if (!packageTimestamp) {
							throw new Error();
						}

						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						const webSignCdnURL = localStorage.getItem(
							'webSignCdnUrl'
						);
						if (!webSignCdnURL) {
							throw new Error();
						}

						const currentPackageTimestamp = await request({
							url: `${webSignCdnURL}current?${(await getTimestamp()).toString()}`
						});

						if (
							packageTimestamp !== currentPackageTimestamp &&
							!(await this.dialogService.toast(
								this.stringsService.applyUpdateRestart,
								5000,
								this.stringsService.cancel
							))
						) {
							reloadWindow();
							return;
						}
					}
					catch {}

					if (!(await this.fingerprintService.supported)) {
						return;
					}

					document.body.classList.add('soft-lock');
					if (await this.fingerprintService.authenticate()) {
						document.body.classList.remove('soft-lock');
						return;
					}

					await this.accountAuthService.lock();
				})
		);

		this.subscriptions.push(
			watchDateChange(true).subscribe(async () =>
				this.updateAccountGoodStanding()
			)
		);

		this.subscriptions.push(
			this.windowWatcherService.visibility
				.pipe(filter(b => b))
				.subscribe(async () => this.updateAccountGoodStanding(true))
		);

		this.subscriptions.push(
			this.accountSettingsService.plan
				.pipe(
					map(
						plan =>
							this.configService.planConfig[plan].rank >
							this.configService.planConfig[CyphPlans.Free].rank
					)
				)
				.subscribe(this.envService.pro)
		);

		this.subscriptions.push(
			this.accountSettingsService.plan
				.pipe(
					map(plan => this.configService.planConfig[plan].telehealth)
				)
				.subscribe(this.envService.telehealthTheme)
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
							groupID,
							route,
							user
						} = await this.getIncomingCallRoute(k);

						const {name, realUsername} =
							(await user?.accountUserProfile.getValue()) || {};

						const incomingCallAnswer = getOrSetDefault<
							string,
							IResolvable<boolean>
						>(this.incomingCallAnswers, k, resolvable);

						const dialogClose = resolvable<() => void>();

						const answered =
							typeof incomingCallAnswer.value === 'boolean' ?
								incomingCallAnswer.value :
								await this.notificationService.ring(
									async () =>
										Promise.race([
											incomingCallAnswer,
											this.dialogService.confirm(
												{
													bottomSheet: true,
													cancel: this.stringsService
														.decline,
													cancelFAB: 'close',
													content: !realUsername ?
														this.stringsService
															.anonymous :
													!name ?
														`@${realUsername}` :
														`${name} (@${realUsername})`,
													fabAvatar: user?.avatar,
													ok: this.stringsService
														.answer,
													okFAB:
														callType === 'chat' ?
															'whatshot' :
														callType === 'video' ?
															'videocam' :
															'phone',
													timeout:
														expires -
														(await getTimestamp()),
													title:
														callType === 'audio' ?
															groupID ?
																this
																	.stringsService
																	.incomingCallAudioGroup :
																this
																	.stringsService
																	.incomingCallAudio :
														callType === 'chat' ?
															groupID ?
																this
																	.stringsService
																	.incomingCallChatGroup :
																this
																	.stringsService
																	.incomingCallChat :
														groupID ?
															this.stringsService
																.incomingCallVideoGroup :
															this.stringsService
																.incomingCallVideo
												},
												dialogClose
											)
										]),
									false,
									true,
									this.notificationService.ringTimeoutLong
								);

						(await dialogClose)();

						if (answered) {
							if (callType === 'chat') {
								openWindow('#' + route.join('/'));
							}
							else {
								this.router.navigate(route);
							}
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
		private readonly salesService: SalesService,

		/** @ignore */
		private readonly stringsService: StringsService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		super();

		this.accountContactsService.interstitial = this.interstitial;

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

			const senderUsername =
				typeof data?.additionalData?.senderUsername === 'string' ?
					normalize(data.additionalData.senderUsername) :
					undefined;

			const dismissed = async () =>
				!!data.additionalData?.foreground &&
				(!data.message ||
					!(await this.dialogService.toast(
						data.message,
						undefined,
						this.stringsService.open
					)));

			switch (notificationType) {
				case NotificationTypes.File:
					if (await dismissed()) {
						return;
					}

					const {recordType} = await this.accountFilesService.getFile(
						data.additionalData.notificationID
					);

					this.router.navigate([
						this.accountFilesService.config[recordType].route
					]);
					break;

				case NotificationTypes.Message:
					if (
						typeof senderUsername !== 'string' ||
						(typeof this.headerInternal.value.header === 'object' &&
							this.headerInternal.value.header.user?.username ===
								senderUsername &&
							this.router.url.startsWith('messages/')) ||
						(await dismissed())
					) {
						return;
					}

					this.router.navigate([
						'messages',
						...(data.additionalData.groupID ?
							[data.additionalData.groupID] :
							['user', senderUsername])
					]);
					break;

				default:
					if (
						!data.additionalData?.foreground ||
						!data.message ||
						data?.additionalData?.activeCall === true ||
						data?.additionalData?.activeCall === 'true'
					) {
						return;
					}

					await this.dialogService.toast(
						data.message,
						undefined,
						this.stringsService.ok
					);
			}
		});

		for (const [callEvent, callAnswer] of <[string, boolean][]> [
			['callAccept', true],
			['callReject', false]
		]) {
			this.accountDatabaseService.pushNotificationsSubscribe(
				callEvent,
				async data => {
					const callMetadata: unknown =
						data?.additionalData?.callMetadata;

					if (typeof callMetadata !== 'string') {
						return;
					}

					this.respondedCallRequests.add(callMetadata);

					getOrSetDefault<string, IResolvable<boolean>>(
						this.incomingCallAnswers,
						callMetadata,
						resolvable
					).resolve(callAnswer);

					if (!callAnswer) {
						return;
					}

					try {
						const {route} = await this.getIncomingCallRoute(
							callMetadata
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
				const senderUsername =
					typeof data?.additionalData?.senderUsername === 'string' ?
						normalize(data.additionalData.senderUsername) :
						undefined;

				if (typeof senderUsername !== 'string') {
					return;
				}

				this.router.navigate(['call', 'user', senderUsername]);
			}
		);

		this.header = observableAll([
			this.headerInternal,
			this.accountSettingsService.telehealth,
			this.envService.isMobile,
			this.transitionInternal
		]).pipe(
			/* eslint-disable-next-line complexity */
			map(([{contextMenuActions, header}, telehealth, isMobile, _]) => {
				const routePath = this.routePath;
				const route = routePath[0] || '';

				const specialCases: Record<string, string> = {
					ehr: 'EHR',
					feed: 'Social Feed',
					inbox: 'Anonymous Inbox',
					pgp: 'PGP',
					schedule: telehealth ? 'Appointments' : 'Meetings'
				};

				/* User headers on desktop are redundant with sidebar */
				if (
					typeof header === 'object' &&
					header.user instanceof User &&
					!isMobile
				) {
					header = undefined;
				}

				/* Special case: set root header on mobile */
				if (!route && isMobile) {
					return {
						contextMenuActions,
						header: this.envService.isTelehealthFull ?
							this.stringsService.profileHeader :
						this.envService.isTelehealth ?
							this.stringsService.productTelehealth :
							this.stringsService.homeHeader
					};
				}

				/* No header */
				if (
					route.length < 1 ||
					(route.length === 1 && route[0] === '') ||
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
					return {contextMenuActions};
				}

				/* No header until explicitly set via accountService.setHeader */
				if (
					['mail', 'messages', 'profile'].indexOf(route) > -1 &&
					routePath.length > 1 &&
					!(routePath[0] === 'profile' && routePath[1] === 'edit')
				) {
					/* Always make at least an empty string on mobile to ensure menu bar displays */
					return {
						contextMenuActions,
						header: isMobile ? header || '' : header
					};
				}

				/*
					No header by default for non-whitelisted sections,
					or deep routes of non-whitelisted sections
				*/
				if (
					[
						'',
						'404',
						'appointments',
						'contacts',
						'docs',
						'doctors',
						'ehr-access',
						'feed',
						'files',
						'forms',
						'inbox',
						'incoming-patient-info',
						'messaging',
						'notes',
						'passwords',
						'patients',
						'pgp',
						'schedule',
						'settings',
						'staff',
						'vault',
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
						'pgp',
						'schedule',
						'settings',
						'wallets'
					].indexOf(route) < 0 &&
						routePath.length > 1)
				) {
					/* Always make at least an empty string on mobile to ensure menu bar displays */
					return {
						contextMenuActions,
						header: isMobile ? header || '' : undefined
					};
				}

				return {
					contextMenuActions,
					header:
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
				};
			}),
			map(({contextMenuActions, header}) => ({
				contextMenuActions,
				header:
					typeof header === 'string' ?
						{desktop: header, mobile: header} :
						header
			}))
		);

		this.menuExpandable = observableAll([
			this.menuReduced,
			this.windowWatcherService.width
		]).pipe(
			map(
				([menuReduced, width]) =>
					!menuReduced && width >= this.menuMinWidth
			)
		);

		this.menuExpanded = observableAll([
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

		this.menuMaxWidth = observableAll([
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
					this.headerInternal.next({});
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
