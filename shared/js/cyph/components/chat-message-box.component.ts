import {Component, ElementRef, Input, OnInit} from '@angular/core';
import * as $ from 'jquery';
import * as tabIndent from 'tab-indent';
import {slideInOutBottom} from '../animations';
import {States} from '../chat/enums';
import {ChatService} from '../services/chat.service';
import {EnvService} from '../services/env.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';
import {VirtualKeyboardWatcherService} from '../services/virtual-keyboard-watcher.service';
import {util} from '../util';


/**
 * Angular component for chat message box.
 */
@Component({
	animations: [slideInOutBottom],
	selector: 'cyph-chat-message-box',
	styleUrls: ['../../css/components/chat-message-box.css'],
	templateUrl: '../../templates/chat-message-box.html'
})
export class ChatMessageBoxComponent implements OnInit {
	/** @ignore */
	private readonly $textarea: Promise<JQuery>	=
		util.waitForIterable(() => $(this.elementRef.nativeElement).find('textarea'))
	;

	/** @ignore */
	private readonly mobileButtonLock: {}		= {};

	/** @see FileInput.accept */
	@Input() public fileAccept: string;

	/** Indicates whether speed dial is open. */
	public isSpeedDialOpen: boolean	= false;

	/** Wrappers for mobile button handlers. */
	public readonly mobileButtonHandlers	= {
		fileTransfer: ($event: File) => {
			this.mobileButtonWrapper(false, () => {
				this.fileTransferService.send($event);
			});
		},
		send: () => {
			this.mobileButtonWrapper(true, () => {
				this.chatService.send();
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
		util.lockTryOnce(this.mobileButtonLock, async () => {
			f();
			if (leaveFocused && this.virtualKeyboardWatcherService.isOpen) {
				(await this.$textarea).focus();
			}
			await util.sleep(500);
		});
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
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
			this.chatService.send();
			$textarea.val('');
		});

		if (this.envService.isMobile) {
			$textarea.focus(async () => {
				await util.sleep(750);
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

	/** Opens mobile menu. */
	public async openMenu ($mdMenu: any) : Promise<void> {
		/* Workaround for Angular Material menu bug */
		if (this.envService.isMobile) {
			let $focused: JQuery;
			do {
				$focused	= $(':focus');
				$focused.blur();
				await util.sleep();
			} while ($focused.length > 0);
		}

		$mdMenu.open();
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly fileTransferService: FileTransferService,

		/** @ignore */
		private readonly virtualKeyboardWatcherService: VirtualKeyboardWatcherService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

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
