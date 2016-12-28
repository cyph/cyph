import {Component, Input} from '@angular/core';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {Chat} from '../chat/chat';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	selector: 'cyph-chat-cyphertext',
	templateUrl: '../../../../templates/chatcyphertext.html'
})
export class ChatCyphertextComponent {
	/** @see IChat */
	@Input() public self: Chat;

	/** @see Strings */
	public readonly strings: Strings	= strings;

	/** @see Users */
	public readonly users: Users		= users;

	constructor () {}
}
