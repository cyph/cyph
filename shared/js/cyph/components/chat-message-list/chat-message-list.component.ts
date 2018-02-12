import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Injector,
	Input,
	OnChanges
} from '@angular/core';
import {SafeStyle} from '@angular/platform-browser';
import * as $ from 'jquery';
import {IVirtualScrollOptions} from 'od-virtualscroll';
import ResizeObserver from 'resize-observer-polyfill';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {of} from 'rxjs/observable/of';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {User} from '../../account/user';
import {fadeInOut} from '../../animations';
import {ChatMessage, IChatData, IVsItem, UiStyles} from '../../chat';
import {AccountService} from '../../services/account.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {ChatMessageGeometryService} from '../../services/chat-message-geometry.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {trackByVsItem} from '../../track-by/track-by-vs-item';
import {getOrSetDefault, getOrSetDefaultAsync} from '../../util/get-or-set-default';
import {urlToSafeStyle} from '../../util/safe-values';


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
	/** @ignore */
	private currentMaxWidth: number			= 0;

	/** @ignore */
	private currentViewportWidth: number	= 0;

	/** @ignore */
	private readonly maxWidthWatcher: Observable<void>	= new Observable(observer => {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
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

	/** @ignore */
	private readonly messageCache: Map<string, ChatMessage>	= new Map<string, ChatMessage>();

	/** @ignore */
	private readonly observableCache	= new Map<IChatData, {
		messages: Observable<ChatMessage[]>;
		unconfirmedMessages: Observable<{[id: string]: boolean|undefined}>;
	}>();

	/** Indicates whether this is the accounts UI. */
	@Input() public accounts: boolean					= false;

	/** @see IChatData */
	@Input() public chat?: IChatData;

	/** @see customBuildLogoVertical */
	public readonly customBackgroundImage: Promise<SafeStyle|undefined>	=
		this.envService.customBuildImages.logoVertical === undefined ?
			Promise.resolve(undefined) :
			urlToSafeStyle(this.envService.customBuildImages.logoVertical).catch(() => undefined)
	;

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean		= false;

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean						= false;

	/** Overrides showDisconnectMessage and always displays the end message. */
	@Input() public persistentEndMessage: boolean		= false;

	/** Includes follow-up appointment button */
	@Input() public promptFollowup?: boolean;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean		= false;

	/** @see trackByVsItem */
	public readonly trackByVsItem: typeof trackByVsItem	= trackByVsItem;

	/** @see ChatMainComponent.uiStyle */
	@Input() public uiStyle: UiStyles					= UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles: typeof UiStyles			= UiStyles;

	/** @ignore */
	@Input() public username?: string					= '';

	/** Data formatted for virtual scrolling. */
	public readonly vsData: BehaviorSubject<IVsItem[]>	= new BehaviorSubject<IVsItem[]>([]);

	/** Equality function for virtual scrolling. */
	public readonly vsEqualsFunc: (a: number, b: number) => boolean	= (() => {
		/*
		const vsData	= this.vsData;

		return (a: number, b: number) =>
			vsData.value.length > a &&
			vsData.value.length > b &&
			vsData.value[a].message.id === vsData.value[b].message.id
		;
		*/

		return () => false;
	})();

	/** Options for virtual scrolling. */
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

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.scrollService.init(
			$(this.elementRef.nativeElement).children().children().first(),
			this.messageCountInTitle
		);
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		if (!this.chat) {
			return;
		}

		const chat	= this.chat;

		const observables	= getOrSetDefault(this.observableCache, chat, () => ({
			messages: chat.messages.watch().pipe(mergeMap(async messages =>
				(await Promise.all(messages.
					filter(message =>
						(message.sessionSubID || undefined) === this.sessionService.sessionSubID
					).
					map(async message => getOrSetDefaultAsync(
						this.messageCache,
						message.id,
						async () => {
							let author: Observable<string>;
							let authorUser: User|undefined;

							if (message.authorType === ChatMessage.AuthorTypes.App) {
								author	= this.sessionService.appUsername;
							}
							else if (message.authorType === ChatMessage.AuthorTypes.Local) {
								author	= this.sessionService.localUsername;

								try {
									const currentUser	=
										/* tslint:disable-next-line:deprecation */
										this.injector.get(AccountDatabaseService).currentUser.value
									;

									authorUser	= currentUser && currentUser.user;
								}
								catch {}
							}
							else if (message.authorID === undefined) {
								author	= this.sessionService.remoteUsername;
							}
							else {
								try {
									/* tslint:disable-next-line:deprecation */
									authorUser	= await this.injector.get(
										AccountUserLookupService
									).getUser(
										/* tslint:disable-next-line:deprecation */
										await this.injector.get(
											AccountContactsService
										).getContactUsername(
											message.authorID
										)
									);
								}
								catch {}

								author	= authorUser === undefined ?
									this.sessionService.remoteUsername :
									authorUser.realUsername
								;
							}

							return new ChatMessage(message, author, authorUser);
						}
					)
				))).sort((a, b) =>
					a.timestamp - b.timestamp
				)
			)),
			unconfirmedMessages: chat.unconfirmedMessages.watch()
		}));

		combineLatest(
			observables.messages,
			this.maxWidthWatcher
		).pipe(map(([messages]) => (
			<(ChatMessage|undefined)[]> (messages.length < 1 ? [undefined] : messages)
		).map((message, i, arr) => ({
			accounts: this.accounts,
			isEnd: (i + 1) === arr.length,
			isFriendTyping: chat.isFriendTyping,
			isStart: i === 0,
			message,
			mobile: this.mobile,
			persistentEndMessage: this.persistentEndMessage,
			showDisconnectMessage: this.showDisconnectMessage,
			uiStyle: this.uiStyle,
			unconfirmedMessages: observables.unconfirmedMessages
		})))).subscribe(
			this.vsData
		);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly injector: Injector,

		/** @ignore */
		private readonly chatMessageGeometryService: ChatMessageGeometryService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		public readonly accountService: AccountService,

		/** @ignore */
		public readonly p2pService: P2PService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
