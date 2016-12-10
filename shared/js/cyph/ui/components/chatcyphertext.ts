import {Component, Input} from '@angular/core';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {IChat} from '../chat/ichat';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	selector: 'cyph-chat-cyphertext',
	templateUrl: '../../../../templates/chatcyphertext.html'
})
export class ChatCyphertext {
	/** @see IChat */
	@Input() public self: IChat;

	/** @see Strings */
	public readonly strings: Strings	= strings;

	/** @see Users */
	public readonly users: Users		= users;

	constructor () {}
}
