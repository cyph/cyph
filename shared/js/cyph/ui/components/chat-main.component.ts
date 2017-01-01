import {ChangeDetectorRef, Component, ElementRef, Input, OnInit} from '@angular/core';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {Util, util} from '../../util';
import {States} from '../chat/enums';
import {ChatService} from '../services/chat.service';
import {EnvService} from '../services/env.service';
import {FileService} from '../services/file.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';


/**
 * Angular component for main chat UI.
 */
@Component({
	selector: 'cyph-chat-main',
	templateUrl: '../../../../templates/chat-main.html'
})
export class ChatMainComponent implements OnInit {
	/** Indicates whether projected disconnection message should be hidden. */
	@Input() public hideDisconnectMessage: boolean;

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean;

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
		this.fileService.files.changeDetectorRef	= this.changeDetectorRef;

		this.scrollService.init(
			$(this.elementRef.nativeElement).find('.message-list'),
			this.messageCountInTitle
		);
	}

	constructor (
		/** @ignore */
		private readonly changeDetectorRef: ChangeDetectorRef,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see FileService */
		public readonly fileService: FileService,

		/** @see P2PService */
		public readonly p2pService: P2PService
	) {}
}
