import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input,
	OnChanges
} from '@angular/core';
import {SafeStyle} from '@angular/platform-browser';
import * as $ from 'jquery';
/* import {IVirtualScrollOptions} from 'od-virtualscroll'; */
/* import ResizeObserver from 'resize-observer-polyfill'; */
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {filter, map, mergeMap, take} from 'rxjs/operators';
import {User} from '../../account/user';
import {fadeInOut} from '../../animations';
import {ChatMessage, IChatData, IVsItem, UiStyles} from '../../chat';
import {MaybePromise} from '../../maybe-promise-type';
import {IChatMessage} from '../../proto';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
/* import {ChatMessageGeometryService} from '../../services/chat-message-geometry.service'; */
import {ChatService} from '../../services/chat.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {trackByVsItem} from '../../track-by/track-by-vs-item';
import {getOrSetDefault, getOrSetDefaultAsync} from '../../util/get-or-set-default';
import {debugLog} from '../../util/log';
import {urlToSafeStyle} from '../../util/safe-values';
import {compareDates, relativeDateString, watchDateChange} from '../../util/time';


/**
 * Angular component for chat message list.
 */
@Component({
	animations: [fadeInOut],
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message-list',
	styleUrls: ['./chat-message-list.component.scss'],
	templateUrl: './chat-message-list.component.html'
})
export class ChatMessageListComponent implements AfterViewInit, OnChanges {
	/* @ignore
	private currentMaxWidth: number			= 0;
	*/

	/* @ignore
	private currentViewportWidth: number	= 0;
	*/

	/* @ignore
	private readonly maxWidthWatcher: Observable<void>	= new Observable(observer => {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE
			observer.next();
			return;
		}

		const resizeObserver	= new ResizeObserver(async () => {
			this.currentMaxWidth		=
				await this.chatMessageGeometryService.getMaxWidth(this.elementRef.nativeElement)
			;

			this.currentViewportWidth	= document.body.clientWidth;

			observer.next();
		});

		resizeObserver.observe(this.elementRef.nativeElement);

		return () => { resizeObserver.disconnect(); };
	});
	*/

	/** @ignore */
	private readonly messageCache: Map<string, {
		dateChange?: string;
		message: ChatMessage;
		pending: boolean;
	}>	=
		new Map()
	;

	/** @ignore */
	private readonly observableCache	= new Map<IChatData, {
		messages: Observable<{dateChange?: string; message: ChatMessage; pending: boolean}[]>;
		unconfirmedMessages: Observable<{[id: string]: boolean|undefined}|undefined>;
	}>();

	/** @see IChatData */
	@Input() public chat?: IChatData;

	/** @see customBuildLogoVertical */
	public readonly customBackgroundImage: Promise<SafeStyle|undefined>	=
		this.envService.customBuildImages.logoVertical === undefined ?
			Promise.resolve(undefined) :
			urlToSafeStyle(this.envService.customBuildImages.logoVertical).catch(() => undefined)
	;

	/** Used for initial scroll down on load. */
	public readonly initialScrollDown: BehaviorSubject<boolean>	= new BehaviorSubject(true);

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean		= false;

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean						= false;

	/** Overrides showDisconnectMessage and always displays the end message. */
	@Input() public persistentEndMessage: boolean		= false;

	/** Contact ID for follow-up appointment button. */
	@Input() public promptFollowup?: string;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean		= false;

	/** @see trackByVsItem */
	public readonly trackByVsItem: typeof trackByVsItem	= trackByVsItem;

	/** @see ChatMainComponent.uiStyle */
	@Input() public uiStyle: UiStyles					= UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles: typeof UiStyles			= UiStyles;

	/** Data formatted for virtual scrolling. */
	public readonly vsData: BehaviorSubject<IVsItem[]>	= new BehaviorSubject<IVsItem[]>([]);

	/* Equality function for virtual scrolling.
	public readonly vsEqualsFunc: (a: number, b: number) => boolean	= (() => {
		/*
		const vsData	= this.vsData;

		return (a: number, b: number) =>
			vsData.value.length > a &&
			vsData.value.length > b &&
			vsData.value[a].message.id === vsData.value[b].message.id
		;
		*

		return () => false;
	})();
	*/

	/* Options for virtual scrolling.
	public readonly vsOptions: Observable<IVirtualScrollOptions>	= of({
		itemHeight: async ({message}: IVsItem) =>
			message === undefined ? 0 : this.chatMessageGeometryService.getHeight(
				message,
				this.currentMaxWidth,
				this.currentViewportWidth
			)
		,
		numLimitColumns: 1
	});
	*/

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		this.initialScrollDown.pipe(filter(b => !b), take(1)).toPromise().then(() => {
			debugLog(() => ({chatMessageList: 'initial load complete'}));
			this.chatService.resolvers.messageListLoaded.resolve();
		});

		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.scrollService.init(
			/* Pending virtual scrolling:
			$(this.elementRef.nativeElement).children().children().first(),
			*/
			$(this.elementRef.nativeElement).children().first(),
			this.messageCountInTitle
		);
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		if (!this.chat) {
			return;
		}

		if (this.uiStyle === UiStyles.email) {
			this.initialScrollDown.next(false);
		}

		const chat				= this.chat;

		const lastUnreadMessage	= await chat.lastUnreadMessage;

		const observables		= getOrSetDefault(this.observableCache, chat, () => ({
			messages: combineLatest(
				chat.messageList.watchFlat().pipe(mergeMap(async messageIDs =>
					Promise.all(messageIDs.map(async id =>
						chat.messages.getItem(id)
					)).catch(() : IChatMessage[] =>
						[]
					)
				)),
				chat.pendingMessages.watch(),
				watchDateChange(true)
			).pipe(mergeMap(async ([onlineMessages, pendingMessages]) => {
				debugLog(() => ({chatMessageList: {onlineMessages, pendingMessages}}));

				if (
					this.initialScrollDown.value &&
					onlineMessages.length < 1 &&
					!lastUnreadMessage
				) {
					this.initialScrollDown.next(false);
				}

				for (let i = pendingMessages.length - 1 ; i >= 0 ; --i) {
					const pendingMessage	= pendingMessages[i];

					for (let j = onlineMessages.length - 1 ; j >= 0 ; --j) {
						if (onlineMessages[j].id === pendingMessage.id) {
							pendingMessages.splice(i, 1);
							break;
						}
					}
				}

				const messages: (IChatMessage&{pending?: true})[]	=
					onlineMessages.concat(pendingMessages)
				;

				return (await (await Promise.all(messages.
					filter(message =>
						(message.sessionSubID || undefined) === this.sessionService.sessionSubID
					).
					map(async message => getOrSetDefaultAsync(
						this.messageCache,
						message.id + (message.pending ? 'pending' : 'online'),
						async () => {
							if (!message.pending) {
								const cached	= this.messageCache.get(message.id + 'pending');
								if (cached) {
									cached.message.updateTimestamp(message.timestamp);
									return {
										dateChange: undefined,
										message: cached.message,
										pending: false
									};
								}
							}

							let author: Observable<string>;
							let authorUser: User|undefined;

							if (message.authorType === ChatMessage.AuthorTypes.App) {
								author	= this.sessionService.appUsername;
							}
							else if (message.authorType === ChatMessage.AuthorTypes.Local) {
								author	= this.sessionService.localUsername;

								const currentUser	=
									this.envService.isAccounts ?
										this.accountDatabaseService.currentUser.value :
										undefined
								;

								authorUser	= currentUser && currentUser.user;
							}
							else if (message.authorID === undefined) {
								author	= this.sessionService.remoteUsername;
							}
							else {
								try {
									authorUser	= this.envService.isAccounts ?
										await this.accountUserLookupService.getUser(
											message.authorID,
											false
										) :
										undefined
									;
								}
								catch {}

								author	= authorUser === undefined ?
									this.sessionService.remoteUsername :
									authorUser.realUsername
								;
							}

							return {
								dateChange: undefined,
								message: new ChatMessage(message, author, authorUser),
								pending: message.pending === true
							};
						}
					)
				))).sort((a, b) =>
					a.pending && !b.pending ?
						1 :
					!a.pending && b.pending ?
						-1 :
						a.message.timestamp - b.message.timestamp
				).reduce(
					async (acc, o) => Promise.resolve(acc).then(async ({last, messageList}) => ({
						last: o.message.timestamp,
						messageList: messageList.concat({
							...o,
							dateChange: (
								last === undefined ||
								!compareDates(last, o.message.timestamp, true)
							) ?
								await relativeDateString(o.message.timestamp, last === undefined) :
								undefined
						})
					})),
					<MaybePromise<{
						last?: number;
						messageList: {
							dateChange?: string;
							message: ChatMessage;
							pending: boolean;
						}[];
					}>>
					{last: undefined, messageList: []}
				)).messageList;
			})),
			unconfirmedMessages: chat.unconfirmedMessages
		}));

		/*
		combineLatest(
			observables.messages,
			this.maxWidthWatcher
		)
		*/
		observables.messages.pipe(map(messages => (
			<({dateChange?: string; message?: ChatMessage; pending: boolean})[]>
			(messages.length < 1 ? [{pending: false}] : messages)
		).map(({dateChange, message, pending}, i, arr) => {
			const isEnd	= (i + 1) === arr.length;

			return {
				accounts: this.envService.isAccounts,
				dateChange,
				isEnd,
				isFriendTyping: chat.isFriendTyping,
				isStart: i === 0,
				message,
				mobile: this.mobile,
				pending,
				persistentEndMessage: this.persistentEndMessage,
				scrollIntoView: this.initialScrollDown.value && (
					lastUnreadMessage ?
						((message && message.id) === lastUnreadMessage) :
						isEnd
				),
				showDisconnectMessage: this.showDisconnectMessage,
				uiStyle: this.uiStyle,
				unconfirmedMessages: observables.unconfirmedMessages
			};
		}))).subscribe(
			this.vsData
		);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/* @ignore
		private readonly chatMessageGeometryService: ChatMessageGeometryService,
		*/

		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
