import {Component, ElementRef, Input, OnInit} from '@angular/core';
import * as $ from 'jquery';
import {ChatMessage} from '../chat';
import {EnvService} from '../services/env.service';
import {ScrollService} from '../services/scroll.service';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	styleUrls: ['../../../css/components/chat-message.scss'],
	templateUrl: '../../../templates/chat-message.html'
})
export class ChatMessageComponent implements OnInit {
	/** @see ChatMessage.AuthorTypes */
	public readonly authorTypes: typeof ChatMessage.AuthorTypes	= ChatMessage.AuthorTypes;

	/** @see ChatMessage */
	@Input() public message: ChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages: {[id: string]: boolean|undefined};

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.message.authorType === ChatMessage.AuthorTypes.Remote) {
			this.scrollService.trackItem($(this.elementRef.nativeElement));
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService
	) {}
}
