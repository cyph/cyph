import {Templates} from '../templates';
import {VirtualKeyboardWatcher} from '../virtualkeyboardwatcher';
import {VisibilityWatcher} from '../visibilitywatcher';
import {IChat} from '../chat/ichat';
import {Env} from '../../env';
import {Util} from '../../util';
import {UpgradeComponent} from '@angular/upgrade/static';
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


/**
 * Angular component for chat message box.
 */
@Directive({
	selector: 'cyph-chat-message-box'
})
export class ChatMessageBox extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphChatMessageBox';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: ChatMessageBox,
		template: Templates.chatMessageBox
	};


	public Cyph: any;
	@Input() self: IChat;

	public isSpeedDialOpen: boolean	= true;

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(ChatMessageBox.title, elementRef, injector);

		(async () => {
			while (!self['Cyph']) {
				await Util.sleep(100);
			}

			this.Cyph	= self['Cyph'];

			const $elementRef	= $(elementRef);

			/* Allow enter press to submit, except on
				mobile without external keyboard */

			let $textarea: JQuery;
			while (!$textarea || $textarea.length < 1) {
				$textarea	= $elementRef.find('textarea');
				await Util.sleep(100);
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
				$speedDial	= $elementRef.find('md-fab-speed-dial:visible');
				await Util.sleep(100);
			}

			$speedDial.removeClass('md-animations-waiting');

			while (!VisibilityWatcher.isVisible) {
				await Util.sleep(100);
			}

			await Util.sleep(1000);
			this.isSpeedDialOpen	= false;
		})();
	}
}
