import {Component, ElementRef} from '@angular/core';
import {ControlContainer, NgForm} from '@angular/forms';
import {slideInOutBottom} from '../../animations';
import {ChatService} from '../../services/chat.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {VirtualKeyboardWatcherService} from '../../services/virtual-keyboard-watcher.service';
import {ChatMessageBoxComponent} from '../chat-message-box';


/**
 * Provides existing NgForm.
 * @see ChatMessageBoxComponent
 */
@Component({
	animations: [slideInOutBottom],
	selector: 'cyph-chat-message-box-inherit-ng-form',
	styleUrls: ['../chat-message-box/chat-message-box.component.scss'],
	templateUrl: '../chat-message-box/chat-message-box.component.html',
	viewProviders: [{provide: ControlContainer, useExisting: NgForm}]
})
export class ChatMessageBoxInheritNgFormComponent extends ChatMessageBoxComponent {
	/** @inheritDoc */
	public readonly inheritsNgForm: boolean	= true;

	constructor (
		elementRef: ElementRef,
		virtualKeyboardWatcherService: VirtualKeyboardWatcherService,
		chatService: ChatService,
		envService: EnvService,
		fileTransferService: FileTransferService,
		p2pService: P2PService,
		scrollService: ScrollService,
		sessionService: SessionService,
		stringsService: StringsService
	) {
		super(
			elementRef,
			virtualKeyboardWatcherService,
			chatService,
			envService,
			fileTransferService,
			p2pService,
			scrollService,
			sessionService,
			stringsService
		);
	}
}
