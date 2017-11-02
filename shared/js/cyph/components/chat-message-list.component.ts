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
import {Observable} from 'rxjs/Observable';
import {fadeInOut} from '../animations';
import {ChatMessage, IChatData} from '../chat';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {EnvService} from '../services/env.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {util} from '../util';


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

	/** Message list. */
	public messages?: Observable<ChatMessage[]>;

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean;

	/** @see IChatData.unconfirmedMessages */
	public unconfirmedMessages?: Observable<{[id: string]: boolean|undefined}>;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.scrollService.init(
			$(this.elementRef.nativeElement).children().first(),
			this.messageCountInTitle
		);
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (!this.chat) {
			return;
		}

		const observables	= util.getOrSetDefault(
			this.observableCache,
			this.chat,
			() => ({
				messages: this.chat.messages.watch().flatMap(async messages =>
					(await Promise.all(messages.map(async message => util.getOrSetDefaultAsync(
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
										/* tslint:disable-next-line:deprecation */
										(await this.injector.get(AccountUserLookupService).getUser(
											/* tslint:disable-next-line:deprecation */
											await this.injector.get(
												AccountContactsService
											).getContactUsername(
												message.authorID
											)
										)).realUsername
						)
					)))).sort((a, b) =>
						a.timestamp - b.timestamp
					)
				),
				unconfirmedMessages: this.chat.unconfirmedMessages.watch()
			})
		);

		this.messages				= observables.messages;
		this.unconfirmedMessages	= observables.unconfirmedMessages;
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly injector: Injector,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {}
}
