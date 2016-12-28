import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Env, env} from '../../env';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {Util, util} from '../../util';
import {Chat} from '../chat/chat';
import {States} from '../chat/enums';


/**
 * Angular component for main chat UI.
 */
@Component({
	selector: 'cyph-chat-main',
	templateUrl: '../../../../templates/chatmain.html'
})
export class ChatMainComponent implements OnInit {
	/** @see IChat */
	@Input() public self: Chat;

	/** Indicates whether projected disconnection message should be hidden. */
	@Input() public hideDisconnectMessage: boolean;

	/** @see Env */
	public readonly env: Env				= env;

	/** @see States */
	public readonly states: typeof States	= States;

	/** @see Strings */
	public readonly strings: Strings		= strings;

	/** @see Users */
	public readonly users: Users			= users;

	/** @see Util */
	public readonly util: Util				= util;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.self.fileManager.files.changeDetectorRef	= this.changeDetectorRef;
	}

	constructor (
		/** @ignore */
		private readonly changeDetectorRef: ChangeDetectorRef
	) {}
}
