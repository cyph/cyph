import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	Output
} from '@angular/core';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs';
import * as tabIndent from 'tab-indent';
import {slideInOutBottom} from '../../animations';
import {BaseProvider} from '../../base-provider';
import {States} from '../../chat/enums';
import {IFile} from '../../ifile';
import {ChatMessageValue} from '../../proto';
import {ChatService} from '../../services/chat.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {VirtualKeyboardWatcherService} from '../../services/virtual-keyboard-watcher.service';
import {lockTryOnce} from '../../util/lock';
import {sleep, waitForIterable} from '../../util/wait';

/**
 * Angular component for chat message box.
 */
@Component({
	animations: [slideInOutBottom],
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message-box',
	styleUrls: ['./chat-message-box.component.scss'],
	templateUrl: './chat-message-box.component.html'
})
export class ChatMessageBoxComponent extends BaseProvider
	implements AfterViewInit {
	/** @ignore */
	private readonly $textarea: Promise<JQuery> = waitForIterable(() =>
		$(this.elementRef.nativeElement).find(
			'.text-message-box textarea:not(.fake)'
		)
	);

	/** @ignore */
	private readonly mobileButtonLock = {};

	/** @see AccountComposeComponent.appointmentShareTimeZone */
	@Input() public appointmentShareTimeZone: boolean = true;

	/** @see AccountComposeComponent.appointmentShareTimeZone */
	@Output() public readonly appointmentShareTimeZoneChange = new EventEmitter<
		boolean
	>();

	/** If true, autofocuses. */
	@Input() public autofocus: boolean = true;

	/** @see CalendarInviteComponent.followUp */
	@Input() public calendarInviteFollowUp: boolean = false;

	/** @see CalendarInviteComponent.reasons */
	@Input() public calendarInviteReasons?: string[];

	/** @see ChatMessageValue.Types */
	public readonly chatMessageValueTypes = ChatMessageValue.Types;

	/** Custom send function. */
	@Input() public customSendFunction?: () => Promise<void>;

	/** @see FileInput.accept */
	@Input() public fileAccept?: string;

	/** If true, will show even when chat session is inactive. */
	@Input() public forceShow: boolean = false;

	/** If true, viewProviders is set to use existing NgForm as ControlContainer. */
	public readonly inheritsNgForm: boolean = false;

	/** Indicates whether speed dial is open. */
	public readonly isSpeedDialOpen = new BehaviorSubject<boolean>(false);

	/** Indicates which version of the UI should be displayed. */
	@Input() public messageType: ChatMessageValue.Types =
		ChatMessageValue.Types.Text;

	/** Wrappers for mobile button handlers. */
	public readonly mobileButtonHandlers = {
		fileTransfer: (file: IFile) => {
			this.mobileButtonWrapper(false, () => {
				this.fileTransferService.send(file);
			});
		},
		send: () => {
			this.mobileButtonWrapper(true, async () => {
				this.send();
				(await this.$textarea).css('height', '0');
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

	/** If false, hides send button. */
	@Input() public showSendButton: boolean = true;

	/** If false, hides unread message indicator. */
	@Input() public showUnreadCount: boolean = true;

	/** @see States */
	public readonly states = States;

	/** Default sendFunction value. */
	private readonly defaultSendFunction: () => Promise<void> = async () => {
		await this.chatService.send(this.messageType);
	};

	/** @ignore */
	private mobileButtonWrapper (leaveFocused: boolean, f: () => void) : void {
		lockTryOnce(this.mobileButtonLock, async () => {
			f();
			if (
				leaveFocused &&
				this.virtualKeyboardWatcherService.isOpen.value
			) {
				(await this.$textarea).trigger('focus');
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

		const $textarea = await this.$textarea;
		const $textareaFake = $textarea.siblings('.fake').eq(0);

		const resizeTextArea = () => {
			$textareaFake.val($textarea.val() || '');
			$textareaFake.width($textarea.width() || 0);
			$textarea.css(
				'height',
				`${$textareaFake[0].scrollHeight.toString()}px`
			);
			$textareaFake.val('');
		};

		$textarea.on('keyup', () => {
			resizeTextArea();
		});

		$textarea.on('keypress', e => {
			if (
				(this.envService.isMobileOS &&
					this.virtualKeyboardWatcherService.isOpen.value) ||
				e.key !== 'Enter' ||
				e.shiftKey
			) {
				resizeTextArea();
				return;
			}

			e.preventDefault();
			this.send();
			$textarea.val('');
			$textarea.css('height', '0');
		});

		if (this.envService.isMobileOS) {
			$textarea.on('focus', async () =>
				this.scrollService.scrollDown(false, 750)
			);
		}
		else {
			/* Allow tabbing for code indentation */
			tabIndent.render($textarea[0]);
		}

		resizeTextArea();

		if (this.autofocus) {
			$textarea.trigger('focus');
		}
	}

	/** Scrolls down and focuses message box. */
	public async scrollDown () : Promise<void> {
		const focus =
			!this.envService.isMobileOS ||
			this.virtualKeyboardWatcherService.isOpen.value;

		this.chatService.jumpToRecentMessages();

		if (focus) {
			(await this.$textarea).trigger('focus');
		}
	}

	/** Sends current message. */
	public async send () : Promise<void> {
		await (this.customSendFunction ?
			this.customSendFunction :
			this.defaultSendFunction)();
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
	) {
		super();
	}
}
