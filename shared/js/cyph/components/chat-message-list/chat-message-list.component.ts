/* eslint-disable max-lines */

import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Inject,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	Optional,
	ViewChild
} from '@angular/core';
import {SafeStyle} from '@angular/platform-browser';
import * as Hammer from 'hammerjs';
import * as $ from 'jquery';
import debounce from 'lodash-es/debounce';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {filter, map, mergeMap, skip, take} from 'rxjs/operators';
import {fadeInOut} from '../../animations';
import {BaseProvider} from '../../base-provider';
import {IChatData, IMessageListItem, UiStyles} from '../../chat';
import {IChatMessage} from '../../proto/types';
import {AccountService} from '../../services/account.service';
import {ChatService} from '../../services/chat.service';
import {EnvService} from '../../services/env.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionInitService} from '../../services/session-init.service';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {trackByMessageListItem} from '../../track-by/track-by-message-list-item';
import {filterUndefinedOperator} from '../../util/filter';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {getOrSetDefault} from '../../util/get-or-set-default';
import {dismissKeyboard} from '../../util/input';
import {debugLog} from '../../util/log';
import {urlToSafeStyle} from '../../util/safe-values';
import {sleep} from '../../util/wait';

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
export class ChatMessageListComponent extends BaseProvider
	implements AfterViewInit, OnChanges, OnDestroy, OnInit {
	/** @ignore */
	private static readonly observableCache = new Map<
		IChatData,
		{
			messages: Observable<(string | (IChatMessage & {pending: true}))[]>;
			unconfirmedMessages: Observable<
				{[id: string]: boolean | undefined} | undefined
			>;
		}
	>();

	/** Full list of message items, not just what's being displayed. */
	private readonly allMessageListItems = new BehaviorSubject<
		IMessageListItem[]
	>([]);

	/** @ignore */
	private readonly changes = new BehaviorSubject<void>(undefined);

	/** @ignore */
	private readonly infiniteScrollingData = {
		initStep: 0,
		items: <IMessageListItem[]> [],
		messageBottomOffset: 1,
		viewportMessageCount: 0
	};

	/** Number of messages to render on the screen at any given time. */
	private readonly viewportMessageCount = toBehaviorSubject(
		combineLatest(
			this.windowWatcherService.height,
			this.envService.isMobile.pipe(map(isMobile => (isMobile ? 69 : 46)))
		).pipe(
			map(([height, minMessageHeight]) =>
				Math.ceil((height + 400) / minMessageHeight)
			)
		),
		0
	);

	/** @see IChatData */
	@Input() public chat?: IChatData;

	/** @see customBuildLogoVertical */
	public readonly customBackgroundImage: Promise<SafeStyle | undefined> =
		this.envService.customBuildImages.logoVertical === undefined ?
			Promise.resolve(undefined) :
			urlToSafeStyle(
				this.envService.customBuildImages.logoVertical
			).catch(() => undefined);

	/** Used for initial scroll down on load. */
	public readonly initialScrollDown = new BehaviorSubject<boolean>(false);

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean = false;

	/** Data formatted for message list. */
	public readonly messageListItems = combineLatest([
		this.allMessageListItems,
		this.chatService.messageBottomOffset,
		this.viewportMessageCount
	]).pipe(
		map(
			([
				allMessageListItems,
				messageBottomOffset,
				viewportMessageCount
			]) => {
				const start = Math.max(
					0,
					allMessageListItems.length -
						Math.max(messageBottomOffset, 1) * viewportMessageCount
				);

				this.infiniteScrollingData.items.splice(
					0,
					this.infiniteScrollingData.items.length,
					...allMessageListItems.slice(
						start,
						start + viewportMessageCount
					)
				);

				return this.infiniteScrollingData.items;
			}
		)
	);

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean = false;

	/** Handles new message load. */
	public readonly onNewMessageLoad = debounce(async () => {
		if (this.infiniteScrollingData.initStep !== 4) {
			return;
		}

		const scrollView = this.scrollView && this.scrollView.nativeElement;

		if (!(scrollView instanceof HTMLElement)) {
			return;
		}

		this.infiniteScrollingData.initStep -= 2;

		await sleep();
		scrollView.scroll(
			0,
			(scrollView.scrollHeight - scrollView.clientHeight) / 2
		);
		this.chatService.scrollTransition.next(false);
	}, 250);

	/** Overrides showDisconnectMessage and always displays the end message. */
	@Input() public persistentEndMessage: boolean = false;

	/** Contact ID for follow-up appointment button. */
	@Input() public promptFollowup?: string;

	/** Scroll view element. */
	@ViewChild('scrollView') public scrollView?: ElementRef;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean = false;

	/** @see trackByMessageListItem */
	public readonly trackByMessageListItem = trackByMessageListItem;

	/** @see ChatMainComponent.uiStyle */
	@Input() public uiStyle: UiStyles = UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles = UiStyles;

	/** Triggers message flash animation. */
	public async flashMessage (elem: HTMLElement) : Promise<void> {
		if (this.infiniteScrollingData.initStep < 3) {
			return;
		}

		await this.chatService.scrollTransition
			.pipe(
				filter(b => !b),
				take(1)
			)
			.toPromise();

		elem.classList.add('cyph-flash-in');
	}

	/** Jumps to recent messages. */
	public jumpToRecentMessages () : void {
		this.initialScrollDown.next(true);
		this.changes.next();
		this.chatService.messageBottomOffset.next(1);
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		/* TODO: HANDLE NATIVE */
		if (this.envService.isWeb) {
			this.scrollService.init(
				$(this.elementRef.nativeElement)
					.children()
					.first(),
				this.messageCountInTitle
			);

			/* Dismiss keyboard when scrolling down on mobile */
			if (this.envService.isMobileOS) {
				new Hammer(this.elementRef.nativeElement, {
					recognizers: [
						[
							Hammer.Pan,
							{direction: Hammer.DIRECTION_DOWN, threshold: 0}
						]
					]
				}).on('pan', dismissKeyboard);
			}
		}

		if (!this.chat) {
			return;
		}

		if (this.uiStyle === UiStyles.mail) {
			this.initialScrollDown.next(false);
		}
		else {
			this.chatService.resolvers.messageListLoaded.promise.then(
				async () => this.scrollService.scrollDown()
			);
		}

		const chat = this.chat;
		const lastUnreadMessage = await chat.lastUnreadMessage;
		const observableCache = ChatMessageListComponent.observableCache;

		const observables = getOrSetDefault(observableCache, chat, () => ({
			messages: combineLatest([
				this.chatService.messages.pipe(
					filterUndefinedOperator<string[]>()
				),
				chat.pendingMessages.watch()
			]).pipe(
				mergeMap(async ([onlineMessages, pendingMessages]) => {
					debugLog(() => ({
						chatMessageList: {onlineMessages, pendingMessages}
					}));

					if (
						this.initialScrollDown.value &&
						onlineMessages.length < 1 &&
						!lastUnreadMessage
					) {
						this.initialScrollDown.next(false);
					}

					for (let i = pendingMessages.length - 1; i >= 0; --i) {
						const pendingMessage = pendingMessages[i];

						for (let j = onlineMessages.length - 1; j >= 0; --j) {
							if (onlineMessages[j] === pendingMessage.id) {
								pendingMessages.splice(i, 1);
								break;
							}
						}
					}

					const messages: (
						| string
						| (IChatMessage & {
								pending: true;
						  })
					)[] = [...onlineMessages, ...pendingMessages];

					if (this.chatService.messageBottomOffset.value > 1) {
						this.chatService.resolvers.messageListLoaded.resolve();
					}

					return messages;
				})
			),
			unconfirmedMessages: chat.unconfirmedMessages
		}));

		this.subscriptions.push(
			combineLatest([observables.messages, this.changes])
				.pipe(
					map(([messages]) =>
						(<
							(
								| string
								| (
										| (IChatMessage & {
												pending: true;
										  })
										| undefined
								  )
							)[]
						> (messages.length < 1 ? [undefined] : messages)).map(
							(message, i, arr) : IMessageListItem => {
								const isEnd = i + 1 === arr.length;

								return {
									accounts:
										this.envService.isAccounts &&
										!this.sessionInitService.ephemeral,
									dateChange: this.chatService.getDateChange(
										message,
										arr[i - 1]
									),
									isEnd,
									isFriendTyping: chat.isFriendTyping,
									isStart: i === 0,
									message,
									mobile: this.mobile,
									persistentEndMessage: this
										.persistentEndMessage,
									scrollIntoView:
										this.initialScrollDown.value &&
										(lastUnreadMessage ?
											(typeof message === 'string' ?
												message :
												message?.id) ===
											lastUnreadMessage :
											isEnd),
									showDisconnectMessage: this
										.showDisconnectMessage,
									uiStyle: this.uiStyle,
									unconfirmedMessages:
										observables.unconfirmedMessages
								};
							}
						)
					)
				)
				.subscribe(this.allMessageListItems)
		);

		this.messageListItems
			.pipe(
				filter(messageListItems => messageListItems.length > 0),
				take(1)
			)
			.toPromise()
			.then(() => {
				this.infiniteScrollingData.initStep +=
					this.chatService.messageBottomOffset.value === 1 ? 1 : 2;
			});
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		this.changes.next();
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.changes.complete();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.chatService.scrollTransition.next(true);

		const messageListItems = await this.messageListItems
			.pipe(skip(1), take(1))
			.toPromise();

		if (messageListItems.length < 1) {
			this.chatService.scrollTransition.next(false);
		}
	}

	/** Handles first message load. */
	public async onMessageListInit () : Promise<void> {
		if (this.infiniteScrollingData.initStep !== 1) {
			return;
		}

		++this.infiniteScrollingData.initStep;

		const scrollView = this.scrollView && this.scrollView.nativeElement;

		if (!(scrollView instanceof HTMLElement)) {
			return;
		}

		scrollView.scroll(0, scrollView.scrollHeight + scrollView.clientHeight);
		this.chatService.scrollTransition.next(false);
	}

	/** Scroll event handler. */
	public onScroll (e: UIEvent) : void {
		if (this.infiniteScrollingData.initStep === 2) {
			++this.infiniteScrollingData.initStep;
			return;
		}

		if (
			this.infiniteScrollingData.initStep !== 3 ||
			this.allMessageListItems.value.length <=
				this.viewportMessageCount.value
		) {
			return;
		}

		const target = e.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}

		const bottom =
			target.scrollTop >= target.scrollHeight - target.clientHeight - 1;

		if (
			!(bottom || target.scrollTop === 0) ||
			(!bottom &&
				this.infiniteScrollingData.items[0]?.message !== undefined &&
				(typeof this.infiniteScrollingData.items[0].message ===
				'string' ?
					this.infiniteScrollingData.items[0].message :
					this.infiniteScrollingData.items[0].message?.id) ===
					(!this.allMessageListItems.value[0] ?
						undefined :
					typeof this.allMessageListItems.value[0].message ===
						'string' ?
						this.allMessageListItems.value[0].message :
						this.allMessageListItems.value[0]?.message?.id))
		) {
			return;
		}

		const messageBottomOffset = Math.min(
			Math.max(
				this.chatService.messageBottomOffset.value +
					(bottom ? -0.5 : 0.5),
				1
			),
			Math.ceil(
				this.allMessageListItems.value.length /
					this.viewportMessageCount.value
			)
		);

		if (
			this.infiniteScrollingData.messageBottomOffset ===
				messageBottomOffset &&
			this.infiniteScrollingData.viewportMessageCount ===
				this.viewportMessageCount.value
		) {
			return;
		}

		this.infiniteScrollingData.messageBottomOffset = messageBottomOffset;
		this.infiniteScrollingData.viewportMessageCount = this.viewportMessageCount.value;

		debugLog(() => ({messageBottomOffset}));

		if (
			messageBottomOffset > 1 ||
			this.chatService.messageBottomOffset.value > 1
		) {
			++this.infiniteScrollingData.initStep;
			this.chatService.scrollTransition.next(true);
		}

		this.scrollService.enableScrollDown = messageBottomOffset <= 1;

		this.chatService.messageBottomOffset.next(messageBottomOffset);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService,

		/** @see AccountService */
		@Inject(AccountService)
		@Optional()
		public readonly accountService: AccountService | undefined,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see SessionInitService */
		public readonly sessionInitService: SessionInitService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
