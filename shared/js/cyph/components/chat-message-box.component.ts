import {Component, ElementRef, Input, OnInit} from '@angular/core';
import * as $ from 'jquery';
import * as tabIndent from 'tab-indent';
import {States} from '../chat/enums';
import {ChatService} from '../services/chat.service';
import {EnvService} from '../services/env.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';
import {VirtualKeyboardWatcherService} from '../services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../services/visibility-watcher.service';
import {util} from '../util';


/**
 * Angular component for chat message box.
 */
@Component({
	selector: 'cyph-chat-message-box',
	styleUrls: ['../../css/components/chat-message-box.css'],
	templateUrl: '../../../templates/chat-message-box.html'
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
	public isSpeedDialOpen: boolean	= true;

	/** Indicates whether speed dial should be displayed. */
	public isSpeedDialReady: boolean;

	/** Button to open mobile menu. */
	public readonly menuButton: {
		click: ($mdMenu: any) => void;
		icon: string;
		label: string;
	}	= {
		click: ($mdMenu: any) => { this.openMenu($mdMenu); },
		icon: 'more_horiz',
		label: util.translate('Menu')
	};

	/** Items inside mobile menu. */
	public readonly menuItems: {
		click: () => void;
		icon: string;
		label: string;
	}[]	= [
		{
			click: () => { this.chatService.helpButton(); },
			icon: 'help_outline',
			label: this.stringsService.help
		},
		{
			click: () => { this.chatService.disconnectButton(); },
			icon: 'close',
			label: this.stringsService.disconnect
		}
	];

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

	/** Speed dial buttons. */
	public readonly speedDialButtons: {
		click?: () => void;
		cssClass?: string;
		disabled?: () => boolean;
		fileAccept?: string;
		fileChange?: ($event: File) => void;
		icon: string;
		label: string;
		tooltipDirection: string;
	}[]	= [
		{
			fileAccept: this.fileAccept,
			fileChange: ($event: File) => { this.fileTransferService.send($event); },
			icon: 'attach_file',
			label: 'Send File or Photo',
			tooltipDirection: 'left'
		},
		{
			click: () => { this.p2pService.voiceCallButton(); },
			disabled: () => !this.p2pService.isEnabled,
			icon: 'phone',
			label: 'Voice Call',
			tooltipDirection: 'left'
		},
		{
			click: () => { this.p2pService.videoCallButton(); },
			disabled: () => !this.p2pService.isEnabled,
			icon: 'videocam',
			label: 'Video Call',
			tooltipDirection: 'left'
		},
		{
			click: () => { this.chatService.helpButton(); },
			cssClass: 'dark',
			icon: 'help_outline',
			label: this.stringsService.help,
			tooltipDirection: 'left'
		},
		{
			click: () => { this.chatService.disconnectButton(); },
			cssClass: 'dark',
			icon: 'close',
			label: this.stringsService.disconnect,
			tooltipDirection: 'left'
		}
	];

	/** Speed dial buttons to display during voice/video call. */
	public readonly speedDialButtonsP2P: {
		click?: () => void;
		disabled?: () => boolean;
		fileAccept?: string;
		fileChange?: ($event: File) => void;
		icon: string;
		label: string;
		tooltipDirection: string;
	}[]	= this.speedDialButtons.filter(o => !o.disabled);

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

		const $element	= $(this.elementRef.nativeElement);

		/* Temporary workaround for Angular Material bug */

		const isVideoCallMessageBox	= $element.hasClass('video-call-message-box');

		while (
			!this.visibilityWatcherService.isVisible ||
			!$element.is(':visible') ||
			(
				isVideoCallMessageBox &&
				!this.p2pService.isSidebarOpen
			)
		) {
			await util.sleep();
		}

		await util.sleep(500);
		this.isSpeedDialReady	= true;
		await util.sleep(1000);
		this.isSpeedDialOpen	= false;

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

		/** @ignore */
		private readonly visibilityWatcherService: VisibilityWatcherService,

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
