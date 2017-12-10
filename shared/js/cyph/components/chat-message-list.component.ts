import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Injector,
	Input,
	OnChanges
} from '@angular/core';
import * as $ from 'jquery';
import {IVirtualScrollOptions} from 'od-virtualscroll';
import ResizeObserver from 'resize-observer-polyfill';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {of} from 'rxjs/observable/of';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {Subject} from 'rxjs/Subject';
import {fadeInOut} from '../animations';
import {ChatMessage, IChatData, IVsItem} from '../chat';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {ChatMessageGeometryService} from '../services/chat-message-geometry.service';
import {EnvService} from '../services/env.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';
import {getOrSetDefault, getOrSetDefaultAsync} from '../util/get-or-set-default';


/**
 * Angular component for chat message list.
 */
@Component({
	animations: [fadeInOut],
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message-list',
	styleUrls: ['../../../css/components/chat-message-list.scss'],
	templateUrl: '../../../templates/chat-message-list.html'
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
	@Input() public accounts: boolean	= false;

	/** @see IChatData */
	@Input() public chat: IChatData;

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean;

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean;

	/** Data formatted for virtual scrolling. */
	public vsData	= new Subject<IVsItem[]>();

	/** Options for virtual scrolling. */
	public readonly vsOptions: Observable<IVirtualScrollOptions>	= of({
		itemHeight: async ({message}: IVsItem) => this.chatMessageGeometryService.getHeight(
			message,
			this.currentMaxWidth,
			this.currentViewportWidth
		),
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

		const observables	= getOrSetDefault(
			this.observableCache,
			chat,
			() => ({
				messages: chat.messages.watch().pipe(mergeMap(async messages =>
					(await Promise.all(messages.map(async message => getOrSetDefaultAsync(
						this.messageCache,
						message.id,
						async () => new ChatMessage(
							message,
							message.authorType === ChatMessage.AuthorTypes.App ?
								this.sessionService.appUsername :
								message.authorType === ChatMessage.AuthorTypes.Local ?
									this.sessionService.localUsername :
									message.authorID === undefined ?
										this.sessionService.remoteUsername :
										(
											/* tslint:disable-next-line:deprecation */
											(await this.injector.get(
												AccountUserLookupService
											).getUser(
												/* tslint:disable-next-line:deprecation */
												await this.injector.get(
													AccountContactsService
												).getContactUsername(
													message.authorID
												)
											)) ||
											{realUsername: this.sessionService.remoteUsername}
										).realUsername
						)
					)))).sort((a, b) =>
						a.timestamp - b.timestamp
					)
				)),
				unconfirmedMessages: chat.unconfirmedMessages.watch()
			})
		);

		combineLatest<ChatMessage[]|void>([
			observables.messages,
			this.maxWidthWatcher
		]).pipe(map(([messages]: ChatMessage[][]) => messages.map((message, i) => ({
			accounts: this.accounts,
			isEnd: (i + 1) === messages.length,
			isFriendTyping: chat.isFriendTyping,
			isStart: i === 0,
			message,
			mobile: this.mobile,
			showDisconnectMessage: this.showDisconnectMessage,
			unconfirmedMessages: observables.unconfirmedMessages
		})))).subscribe(
			this.vsData
		);
	}

	/** Equality function for virtual scrolling. */
	public vsEqualsFunc () : boolean {
		return false;
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

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
