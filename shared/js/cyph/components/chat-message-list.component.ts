import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input,
	OnChanges
} from '@angular/core';
import * as $ from 'jquery';
import {Observable} from 'rxjs';
import {fadeInOut} from '../animations';
import {ChatMessage, IChatData} from '../chat';
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
				messages: this.chat.messages.watch().map(messages =>
					messages.map(message =>
						util.getOrSetDefault(
							this.messageCache,
							message.id,
							() => new ChatMessage(
								message,
								message.authorType === ChatMessage.AuthorTypes.App ?
									this.sessionService.appUsername :
									message.authorType === ChatMessage.AuthorTypes.Local ?
										this.sessionService.localUsername :
										message.authorID === undefined ?
											this.sessionService.remoteUsername :
											(() => { throw new Error('Not yet implemented.'); })()
							)
						)
					).sort((a, b) =>
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
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {}
}
