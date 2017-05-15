import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {Set as ImmutableSet} from 'immutable';
import * as $ from 'jquery';
import {IChatMessage} from '../chat/ichat-message';
import {EnvService} from '../services/env.service';
import {ScrollService} from '../services/scroll.service';
import {StringsService} from '../services/strings.service';
import {Users, users} from '../session/enums';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	styleUrls: ['../../../css/components/chat-message.scss'],
	templateUrl: '../../../templates/chat-message.html'
})
export class ChatMessageComponent implements OnInit {
	/** @see IChatMessage */
	@Input() public message: IChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages: ImmutableSet<string>;

	/** @see Users */
	public readonly users: Users	= users;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.message.author !== users.app && this.message.author !== users.me) {
			this.scrollService.trackItem($(this.elementRef.nativeElement));
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
