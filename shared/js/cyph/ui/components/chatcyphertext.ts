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
	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	public strings: Strings	= strings;

	/** @ignore */
	public users: Users		= users;

	constructor () {}
}
