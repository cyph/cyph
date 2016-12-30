import {ChangeDetectorRef, Component, ElementRef, Input, OnInit} from '@angular/core';
import {Env, env} from '../../env';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {Util, util} from '../../util';
import {Chat} from '../chat/chat';
import {States} from '../chat/enums';
import {ChatService} from '../services/chat.service';
import {FileService} from '../services/file.service';
import {P2pService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';


/**
 * Angular component for main chat UI.
 */
@Component({
	providers: [
		ChatService,
		FileService,
		P2pService,
		ScrollService
	],
	selector: 'cyph-chat-main',
	templateUrl: '../../../../templates/chat-main.html'
})
export class ChatMainComponent implements OnInit {
	/** @see IChat */
	@Input() public self: Chat;

	/** Indicates whether projected disconnection message should be hidden. */
	@Input() public hideDisconnectMessage: boolean;

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean;

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

		this.scrollService.init(
			$(this.elementRef.nativeElement).find('.message-list > md2-content'),
			this.messageCountInTitle
		);
	}

	constructor (
		/** @ignore */
		private readonly changeDetectorRef: ChangeDetectorRef,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly scrollService: ScrollService
	) {}
}
