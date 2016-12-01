import {
	Directive,
	DoCheck,
	ElementRef,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';
import {Env} from '../../env';
import {Util} from '../../util';
import {IChat} from '../chat/ichat';
import {VirtualKeyboardWatcher} from '../virtualkeyboardwatcher';
import {VisibilityWatcher} from '../visibilitywatcher';


/**
 * Angular component for chat message box.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'cyph-chat-message-box'
})
export class ChatMessageBox
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'cyphChatMessageBox';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			fileInputAccept: '<',
			self: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public readonly self: IChat;

			/** @ignore */
			public readonly fileInputAccept: string;

			/** @ignore */
			public isSpeedDialOpen: boolean	= true;

			/** @ignore */
			public isSpeedDialReady: boolean;

			/** @ignore */
			public async openMenu ($mdMenu: any, $event: any) : Promise<void> {
				/* Workaround for Angular Material menu bug */
				let $focused: JQuery;
				do {
					$focused	= $(':focus');
					$focused.blur();
					await Util.sleep();
				} while ($focused.length > 0);

				$mdMenu.open($event);
			}

			constructor ($element: JQuery) { (async () => {
				while (!cyph) {
					await Util.sleep();
				}

				this.cyph	= cyph;

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
		},
		templateUrl: '../../../../templates/chatmessagebox.html'
	};


	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	@Input() public fileInputAccept: string;

	/** @ignore */
	public ngDoCheck () : void {
		super.ngDoCheck();
	}

	/** @ignore */
	public ngOnChanges (changes: SimpleChanges) : void {
		super.ngOnChanges(changes);
	}

	/** @ignore */
	public ngOnDestroy () : void {
		super.ngOnDestroy();
	}

	/** @ignore */
	public ngOnInit () : void {
		super.ngOnInit();
	}

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(ChatMessageBox.title, elementRef, injector);
	}
}
