import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {env} from '../../env';
import {Strings, strings} from '../../strings';
import {util} from '../../util';
import {States} from '../chat/enums';
import {IChat} from '../chat/ichat';
import {Elements} from '../elements';
import {virtualKeyboardWatcher} from '../virtualkeyboardwatcher';
import {visibilityWatcher} from '../visibilitywatcher';


/**
 * Angular component for chat message box.
 */
@Component({
	selector: 'cyph-chat-message-box',
	templateUrl: '../../../../templates/chatmessagebox.html'
})
export class ChatMessageBox implements OnInit {
	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	@Input() public fileAccept: string;

	/** @ignore */
	public isSpeedDialReady: boolean;

	/** @ignore */
	public isSpeedDialOpen: boolean	= true;

	/** @ignore */
	public states: typeof States	= States;

	/** @ignore */
	public strings: Strings			= strings;

	/** @ignore */
	public menuButton: {
		click: ($mdMenu: any) => void,
		icon: string,
		label: string
	}	= {
		click: ($mdMenu: any) => this.openMenu($mdMenu),
		icon: 'more_horiz',
		label: util.translate('Menu')
	};

	/** @ignore */
	public menuItems: {
		click: () => void,
		icon: string,
		label: string
	}[]	= [
		{
			click: () => this.self.helpButton(),
			icon: 'help_outline',
			label: strings.help
		},
		{
			click: () => this.self.disconnectButton(),
			icon: 'close',
			label: strings.disconnect
		}
	];

	/** @ignore */
	public speedDialButtons: {
		class?: string;
		click?: () => void;
		disabled?: () => boolean;
		fileAccept?: string;
		fileChange?: ($event: File) => void;
		icon: string;
		label: string;
		tooltipDirection: string;
	}[]	= [
		{
			fileAccept: this.fileAccept,
			fileChange: ($event: File) => this.self.fileManager.send($event),
			icon: 'attach_file',
			label: 'Send File or Photo',
			tooltipDirection: 'left'
		},
		{
			click: () => this.self.p2pManager.voiceCallButton(),
			disabled: () => !this.self.p2pManager.isEnabled,
			icon: 'phone',
			label: 'Voice Call',
			tooltipDirection: 'left'
		},
		{
			click: () => this.self.p2pManager.videoCallButton(),
			disabled: () => !this.self.p2pManager.isEnabled,
			icon: 'videocam',
			label: 'Video Call',
			tooltipDirection: 'left'
		},
		{
			class: 'dark',
			click: () => this.self.helpButton(),
			icon: 'help_outline',
			label: strings.help,
			tooltipDirection: 'left'
		},
		{
			class: 'dark',
			click: () => this.self.disconnectButton(),
			icon: 'close',
			label: strings.disconnect,
			tooltipDirection: 'left'
		}
	];

	/** @ignore */
	public speedDialButtonsP2P: {
		click?: () => void;
		disabled?: () => boolean;
		fileAccept?: string;
		fileChange?: ($event: File) => void;
		icon: string;
		label: string;
		tooltipDirection: string;
	}[]	= this.speedDialButtons.filter(o => !o.disabled);

	/** @ignore */
	public async openMenu ($mdMenu: any) : Promise<void> {
		/* Workaround for Angular Material menu bug */
		if (env.isMobile) {
			let $focused: JQuery;
			do {
				$focused	= $(':focus');
				$focused.blur();
				await util.sleep();
			} while ($focused.length > 0);
		}

		$mdMenu.open();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		const $element	= $(this.elementRef.nativeElement);

		/* Temporary workaround for Angular Material bug */

		const isVideoCallMessageBox	= $element.hasClass('video-call-message-box');

		while (
			!visibilityWatcher.isVisible ||
			!$element.is(':visible') ||
			(
				isVideoCallMessageBox &&
				!this.self.p2pManager.isSidebarOpen
			)
		) {
			await util.sleep();
		}

		this.isSpeedDialReady	= true;
		await util.sleep(1000);
		this.isSpeedDialOpen	= false;

		/* Allow enter press to submit, except on
			mobile without external keyboard */

		const $textarea	= await Elements.waitForElement(
			() => $element.find('textarea')
		);

		$textarea.keypress(e => {
			if (
				(env.isMobile && virtualKeyboardWatcher.isOpen) ||
				e.keyCode !== 13 ||
				e.shiftKey
			) {
				return;
			}

			e.preventDefault();
			this.self.send();
		});

		if (this.self.isMobile) {
			/* Prevent jankiness upon message send on mobile */

			let lastClick	= 0;

			const $buttons	= await Elements.waitForElement(
				() => $element.find('.message-box-button-group .md-button')
			);

			$textarea.on('mousedown', e => {
				const now: number	= util.timestamp();

				if ($textarea.is(':focus') && !virtualKeyboardWatcher.isOpen) {
					$textarea.blur();
				}

				const wasButtonClicked	=
					(now - lastClick <= 500) ||
					$buttons.filter(':visible').toArray().reduce(
						(clicked: boolean, elem: HTMLElement) => {
							if (clicked) {
								return true;
							}

							const bounds	= elem.getBoundingClientRect();

							if (!(
								(e.clientY > bounds.top && e.clientY < bounds.bottom) &&
								(e.clientX > bounds.left && e.clientX < bounds.right)
							)) {
								return false;
							}

							$(elem).click();

							return true;
						},
						false
					)
				;

				if (!wasButtonClicked) {
					return;
				}

				lastClick	= now;

				e.stopPropagation();
				e.preventDefault();
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
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef
	) {}
}
