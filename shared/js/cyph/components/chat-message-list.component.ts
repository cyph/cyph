import {ChangeDetectionStrategy, Component, ElementRef, Input, OnInit} from '@angular/core';
import {List, Set as ImmutableSet} from 'immutable';
import {fadeInOut} from '../animations';
import {IChatMessage} from '../chat';
import {EnvService} from '../services/env.service';
import {ScrollService} from '../services/scroll.service';


/**
 * Angular component for chat message list.
 */
@Component({
	animations: [fadeInOut],
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message-list',
	styleUrls: ['../../css/components/chat-message-list.css'],
	templateUrl: '../../templates/chat-message-list.html'
})
export class ChatMessageListComponent implements OnInit {
	/** @see IChatData.isFriendTyping */
	@Input() public isFriendTyping: boolean;

	/** Indicates whether message count should be displayed in title. */
	@Input() public messageCountInTitle: boolean;

	/** @see IChatData.messages */
	@Input() public messages: List<IChatMessage>;

	/** @see ChatMessageComponent.mobile */
	@Input() public mobile: boolean;

	/** Indicates whether disconnect message should be displayed. */
	@Input() public showDisconnectMessage: boolean;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages: ImmutableSet<string>;

	/** @inheritDoc */
	public ngOnInit () : void {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const $element	= $(this.elementRef.nativeElement);

		this.scrollService.init(
			$element.find('.message-list-background > div'),
			this.messageCountInTitle
		);
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
