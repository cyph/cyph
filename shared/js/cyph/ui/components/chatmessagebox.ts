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
import {Templates} from '../templates';
import {VirtualKeyboardWatcher} from '../virtualkeyboardwatcher';
import {VisibilityWatcher} from '../visibilitywatcher';


/**
 * Angular component for chat message box.
 */
@Directive({
	selector: 'cyph-chat-message-box'
})
export class ChatMessageBox
	extends UpgradeComponent
	implements DoCheck, OnChanges, OnInit, OnDestroy
{
	/** Component title. */
	public static title: string	= 'cyphChatMessageBox';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: class {
			public Cyph: any;
			public self: IChat;

			public isSpeedDialOpen: boolean	= true;

			constructor ($element: JQuery) { (async () => {
				while (!self['Cyph']) {
					await Util.sleep();
				}

				this.Cyph	= self['Cyph'];

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

				/* Temporary workarounds for Angular Material bugs */

				let $speedDial: JQuery;
				while (!$speedDial || $speedDial.length < 1) {
					$speedDial	= $element.find('md-fab-speed-dial:visible');
					await Util.sleep();
				}

				$speedDial.removeClass('md-animations-waiting');

				while (!VisibilityWatcher.isVisible) {
					await Util.sleep();
				}

				await Util.sleep(1000);
				this.isSpeedDialOpen	= false;
			})(); }
		},
		template: Templates.chatMessageBox
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
