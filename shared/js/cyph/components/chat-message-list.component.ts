import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input} from '@angular/core';
import {List, Map as ImmutableMap} from 'immutable';
import * as $ from 'jquery';
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
	styleUrls: ['../../../css/components/chat-message-list.scss'],
	templateUrl: '../../../templates/chat-message-list.html'
})
export class ChatMessageListComponent implements AfterViewInit {
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
	@Input() public unconfirmedMessages: ImmutableMap<string, boolean>;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.scrollService.init(
			$(this.elementRef.nativeElement).children().first(),
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
