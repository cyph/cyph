import {
	Component,
	ElementRef,
	Input,
	OnInit,
	Renderer2
} from '@angular/core';
import * as $ from 'jquery';
import {ChatMessage} from '../chat';
import {ChatService} from '../services/chat.service';
import {EnvService} from '../services/env.service';
import {ScrollService} from '../services/scroll.service';
import {StringsService} from '../services/strings.service';
import {waitForIterable} from '../util/wait';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	styleUrls: ['../../../css/components/chat-message.scss'],
	templateUrl: '../../../templates/chat-message.html'
})
export class ChatMessageComponent implements OnInit {
	/** Indicates whether this is the accounts UI. */
	@Input() public accounts: boolean	= false;

	/** @see ChatMessage.AuthorTypes */
	public readonly authorTypes: typeof ChatMessage.AuthorTypes	= ChatMessage.AuthorTypes;

	/** @see ChatMessage */
	@Input() public message?: ChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean		= false;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages?: {[id: string]: boolean|undefined};

	/** Indicates whether message is confirmed. */
	public get confirmed () : boolean {
		return (
			this.message === undefined ||
			this.unconfirmedMessages === undefined ||
			this.message.authorType !== ChatMessage.AuthorTypes.Local ||
			!(this.message.id && this.unconfirmedMessages[this.message.id])
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (this.message === undefined) {
			return;
		}

		await this.chatService.getMessageValue(this.message);

		if (this.unconfirmedMessages === undefined) {
			return;
		}

		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.message.authorType === ChatMessage.AuthorTypes.Remote) {
			this.scrollService.trackItem($(this.elementRef.nativeElement));
		}
	}

	/** Resolves after view init. */
	public async waitUntilInitiated () : Promise<void> {
		const $elem		= $(this.elementRef.nativeElement);
		const $message	= await waitForIterable(() => $elem.find('.message'));

		await Promise.all($message.find('*').toArray().map(async element => {
			const promise	= new Promise<void>(async resolve => {
				$(element).one('transitionend', () => { resolve(); });
			});

			this.renderer.addClass(element, 'transitionend');

			await promise;
		}));
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
