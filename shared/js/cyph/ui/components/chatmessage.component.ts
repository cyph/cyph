import {Component, Input} from '@angular/core';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {IChatMessage} from '../chat/ichat-message';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	templateUrl: '../../../../templates/chatmessage.html'
})
export class ChatMessageComponent {
	/** @see IChatMessage */
	@Input() public message: IChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean;

	/** @see Strings */
	public readonly strings: Strings	= strings;

	/** @see Users */
	public readonly users: Users		= users;

	constructor () {}
}
