import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input} from '@angular/core';
import * as $ from 'jquery';
import {Observable} from 'rxjs';
import {fadeInOut} from '../animations';
import {ChatMessage} from '../chat';
import {ChatService} from '../services/chat.service';
import {EnvService} from '../services/env.service';
import {ScrollService} from '../services/scroll.service';
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
export class ChatMessageListComponent implements AfterViewInit {
	/** @ignore */
	private readonly messageCache: Map<string, ChatMessage>	= new Map<string, ChatMessage>();

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean;

	/** Message list. */
	public messages: Observable<ChatMessage[]>	=
		this.chatService.chat.messages.watch().map(messages =>
			messages.map(message =>
				util.getOrSetDefault(
					this.messageCache,
					message.id,
					() => new ChatMessage(message)
				)
			).sort((a, b) =>
				a.timestamp - b.timestamp
			)
		)
	;

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages: Observable<{[id: string]: boolean|undefined}>	=
		this.chatService.chat.unconfirmedMessages.watch()
	;

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

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see ChatService */
		public readonly chatService: ChatService
	) {}
}
