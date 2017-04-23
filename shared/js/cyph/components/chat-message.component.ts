import {Component, ElementRef, Input, OnInit} from '@angular/core';
import * as $ from 'jquery';
import {IChatMessage} from '../chat/ichat-message';
import {ChatService} from '../services/chat.service';
import {EnvService} from '../services/env.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';
import {Users, users} from '../session/enums';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	styleUrls: ['../../css/components/chat-message.css'],
	templateUrl: '../../templates/chat-message.html'
})
export class ChatMessageComponent implements OnInit {
	/** @see IChatMessage */
	@Input() public message: IChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean;

	/** @see Users */
	public readonly users: Users	= users;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.scrollService.trackItem(this.message, $(this.elementRef.nativeElement));
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
