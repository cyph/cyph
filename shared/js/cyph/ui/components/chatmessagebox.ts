import {Component, ElementRef, Input} from '@angular/core';
import {Env} from '../../env';
import {Util} from '../../util';
import {IChat} from '../chat/ichat';
import {VirtualKeyboardWatcher} from '../virtualkeyboardwatcher';
import {VisibilityWatcher} from '../visibilitywatcher';


/**
 * Angular component for chat message box.
 */
@Component({
	selector: 'cyph-chat-message-box',
	templateUrl: '../../../../templates/chatmessagebox.html'
})
export class ChatMessageBox {
	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	@Input() public fileInputAccept: string;

	/** @ignore */
	public cyph: any;

	/** @ignore */
	public $mdMenu: any;

	/** @ignore */
	public isSpeedDialReady: boolean;

	/** @ignore */
	public isSpeedDialOpen: boolean	= true;

	/** @ignore */
	public async openMenu () : Promise<void> {
		/* Workaround for Angular Material menu bug */
		let $focused: JQuery;
		do {
			$focused	= $(':focus');
			$focused.blur();
			await Util.sleep();
		} while ($focused.length > 0);

		this.$mdMenu.open();
	}

	constructor (elementRef: ElementRef) { (async () => {
		while (!cyph) {
			await Util.sleep();
		}

		this.cyph	= cyph;

		const $element	= $(elementRef.nativeElement);

		/* Temporary workaround for Angular Material bug */

		const isVideoCallMessageBox	= $element.hasClass('video-call-message-box');

		while (
			!VisibilityWatcher.isVisible ||
			!$element.is(':visible') ||
			(
				isVideoCallMessageBox &&
				!this.self.p2pManager.isSidebarOpen
			)
		) {
			await Util.sleep();
		}

		this.isSpeedDialReady	= true;
		await Util.sleep(1000);
		this.isSpeedDialOpen	= false;

		/* Allow enter press to submit, except on
			mobile without external keyboard */

		let $textarea: JQuery;
		while (!$textarea || $textarea.length < 1) {
			$textarea	= $element.find('textarea');
			await Util.sleep();
		}

		$textarea.keypress(e => {
			if (
				(Env.isMobile && VirtualKeyboardWatcher.isOpen) ||
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

			let $buttons: JQuery;
			while (!$buttons || $buttons.length < 1) {
				$buttons	= $element.find('.message-box-button-group .md-button');
				await Util.sleep();
			}

			$textarea.on('mousedown', e => {
				const now: number	= Util.timestamp();

				if ($textarea.is(':focus') && !VirtualKeyboardWatcher.isOpen) {
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
	})(); }
}
