import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {Util, util} from '../../util';
import {States} from '../chat/enums';
import {IChat} from '../chat/ichat';


/**
 * Angular component for main chat UI.
 */
@Component({
	selector: 'cyph-chat-main',
	templateUrl: '../../../../templates/chatmain.html'
})
export class ChatMain {
	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	@Input() public hideDisconnectMessage: boolean;

	/** @ignore */
	public env: Env					= env;

	/** @ignore */
	public states: typeof States	= States;

	/** @ignore */
	public strings: Strings			= strings;

	/** @ignore */
	public users: Users				= users;

	/** @ignore */
	public util: Util				= util;

	constructor () {}
}
