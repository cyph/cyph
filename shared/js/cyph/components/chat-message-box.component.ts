/* Temporary workaround pending https://github.com/mgechev/codelyzer/issues/419. */
/* tslint:disable:no-access-missing-member */

import {AfterViewInit, Component, ElementRef, Input} from '@angular/core';
import * as $ from 'jquery';
import * as tabIndent from 'tab-indent';
import {slideInOutBottom} from '../animations';
import {States} from '../chat/enums';
import {ChatMessageValueTypes} from '../proto';
import {ChatService} from '../services/chat.service';
import {EnvService} from '../services/env.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';
import {VirtualKeyboardWatcherService} from '../services/virtual-keyboard-watcher.service';
import {lockTryOnce} from '../util/lock';
import {sleep, waitForIterable} from '../util/wait';


/**
 * Angular component for chat message box.
 */
@Component({
	animations: [slideInOutBottom],
	selector: 'cyph-chat-message-box',
	styleUrls: ['../../../css/components/chat-message-box.scss'],
	templateUrl: '../../../templates/chat-message-box.html'
})
export class ChatMessageBoxComponent implements AfterViewInit {
	/** @ignore */
	private readonly $textarea: Promise<JQuery>	=
		waitForIterable(() => $(this.elementRef.nativeElement).find('textarea'))
	;

	/** @ignore */
	private readonly mobileButtonLock: {}		= {};

	/** Indicates whether this is the accounts UI. */
	@Input() public accounts: boolean	= false;

	/** @see ChatMessageValueTypes */
	public readonly chatMessageValueTypes: typeof ChatMessageValueTypes	= ChatMessageValueTypes;

	/** @see FileInput.accept */
	@Input() public fileAccept: string;

	/** If false, hides buttons. */
	@Input() public showButtons: boolean		= true;

	/** If false, hides unread message indicator. */
	@Input() public showUnreadCount: boolean	= true;

	/** Indicates whether speed dial is open. */
	public isSpeedDialOpen: boolean	= false;

	/** Indicates which version of the message composition UI should be displayed. */
	@Input() public messageType: ChatMessageValueTypes	= ChatMessageValueTypes.Text;

	/** Wrappers for mobile button handlers. */
	public readonly mobileButtonHandlers	= {
		fileTransfer: (file: File) => {
			this.mobileButtonWrapper(false, () => {
				this.fileTransferService.send(file);
			});
		},
		send: () => {
			this.mobileButtonWrapper(true, () => {
				this.send();
			});
		},
		videoCall: () => {
			this.mobileButtonWrapper(false, () => {
				this.p2pService.videoCallButton();
			});
		},
		voiceCall: () => {
			this.mobileButtonWrapper(false, () => {
				this.p2pService.voiceCallButton();
			});
		}
	};

	/** @see States */
	public readonly states: typeof States	= States;

	/** @ignore */
	private mobileButtonWrapper (leaveFocused: boolean, f: () => void) : void {
		lockTryOnce(this.mobileButtonLock, async () => {
			f();
			if (leaveFocused && this.virtualKeyboardWatcherService.isOpen) {
				(await this.$textarea).focus();
			}
			await sleep(500);
		});
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		/* Allow enter press to submit, except on mobile without external keyboard */

		const $textarea	= await this.$textarea;

		$textarea.keypress(e => {
			if (
				(this.envService.isMobile && this.virtualKeyboardWatcherService.isOpen) ||
				e.keyCode !== 13 ||
				e.shiftKey
			) {
				return;
			}

			e.preventDefault();
			this.send();
			$textarea.val('');
		});

		if (this.envService.isMobile) {
			$textarea.focus(async () => {
				await sleep(750);
				this.scrollService.scrollDown();
			});
		}
		else {
			/* Adapt message box to content size on desktop */

			const messageBoxLineHeight: number	= parseInt(
				$textarea.css('line-height'),
				10
			);

			$textarea.on('keyup', () =>
				$textarea.height(
					messageBoxLineHeight *
					$textarea.val().split('\n').length
				)
			);

			/* Allow tabbing for code indentation */

			tabIndent.render($textarea[0]);
		}
	}

	/** Sends current message. */
	public async send () : Promise<void> {
		await this.chatService.send(this.messageType);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly virtualKeyboardWatcherService: VirtualKeyboardWatcherService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see FileTransferService */
		public readonly fileTransferService: FileTransferService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see ScrollService */
		public readonly scrollService: ScrollService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
