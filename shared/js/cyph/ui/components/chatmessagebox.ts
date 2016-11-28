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
	selector: 'cyph-chat-message-box'
})
export class ChatMessageBox
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'cyphChatMessageBox';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			self: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public readonly self: IChat;

			/** @ignore */
			public isSpeedDialOpen: boolean	= true;

			/** @ignore */
			public isSpeedDialReady: boolean;

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
			})(); }
		},
		templateUrl: '../../../../templates/chatmessagebox.html'
	};


	/** @ignore */
	@Input() public self: IChat;

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
