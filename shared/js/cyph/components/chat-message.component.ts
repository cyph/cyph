import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {IChatMessage} from '../chat/ichat-message';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	templateUrl: '../../../templates/chat-message.html'
})
export class ChatMessageComponent implements OnInit {
	/** @see IChatMessage */
	@Input() public message: IChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.scrollService.trackItem(this.message, $(this.elementRef.nativeElement));
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
