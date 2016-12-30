import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {IChatMessage} from '../chat/ichat-message';
import {ScrollService} from '../services/scroll.service';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	templateUrl: '../../../../templates/chat-message.html'
})
export class ChatMessageComponent implements OnInit {
	/** @see IChatMessage */
	@Input() public message: IChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean;

	/** @see Strings */
	public readonly strings: Strings	= strings;

	/** @see Users */
	public readonly users: Users		= users;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.scrollService.trackItem(this.message, $(this.elementRef.nativeElement));
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly scrollService: ScrollService
	) {}
}
