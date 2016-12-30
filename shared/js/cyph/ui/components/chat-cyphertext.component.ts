import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {Chat} from '../chat/chat';
import {ScrollService} from '../services/scroll.service';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	providers: [ScrollService],
	selector: 'cyph-chat-cyphertext',
	templateUrl: '../../../../templates/chat-cyphertext.html'
})
export class ChatCyphertextComponent implements OnInit {
	/** @see IChat */
	@Input() public self: Chat;

	/** @see Strings */
	public readonly strings: Strings	= strings;

	/** @see Users */
	public readonly users: Users		= users;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.scrollService.init(
			$(this.elementRef.nativeElement).find('md2-content')
		);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly scrollService: ScrollService
	) {}
}
