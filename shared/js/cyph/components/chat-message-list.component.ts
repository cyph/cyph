import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {List, Set as ImmutableSet} from 'immutable';
import {IChatMessage} from '../chat';


/**
 * Angular component for chat message list.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message-list',
	styleUrls: ['../../css/components/chat-message-list.css'],
	templateUrl: '../../templates/chat-message-list.html'
})
export class ChatMessageListComponent {
	/** @see IChatData.isFriendTyping */
	@Input() public isFriendTyping: boolean;

	/** @see IChatData.messages */
	@Input() public messages: List<IChatMessage>;

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages: ImmutableSet<string>;

	constructor () {}
}
