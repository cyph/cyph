import {Component, Input} from '@angular/core';
import {ChatService} from '../services/chat.service';


/**
 * Angular component for chat message list.
 */
@Component({
	selector: 'cyph-chat-message-list',
	styleUrls: ['../../css/components/chat-message-list.css'],
	templateUrl: '../../../templates/chat-message-list.html'
})
export class ChatMessageListComponent {
	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean;

	constructor (
		/** @see ChatService */
		public readonly chatService: ChatService
	) {}
}
