import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input
} from '@angular/core';
import $ from 'jquery';
import {fadeIn} from '../../animations';
import {BaseProvider} from '../../base-provider';
import {States, UiStyles} from '../../chat/enums';
import {ChatMessageValue, IAppointment} from '../../proto';
import {ChatService} from '../../services/chat.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {trackByIndex, trackByTransfer} from '../../track-by';
import {readableByteLength} from '../../util/formatting';
import {urlToSafeStyle} from '../../util/safe-values';

/**
 * Angular component for main chat UI.
 */
@Component({
	animations: [fadeIn],
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-main',
	styleUrls: ['./chat-main.component.scss'],
	templateUrl: './chat-main.component.html'
})
export class ChatMainComponent extends BaseProvider implements AfterViewInit {
	/** Appointment associated with this call. */
	@Input() public appointment?: IAppointment;

	/** @see ChatMessageValue.Types */
	public readonly chatMessageValueTypes = ChatMessageValue.Types;

	/** Force display video UI. */
	@Input() public forceDisplayVideo: boolean = false;

	/** Indicates whether projected disconnection message should be hidden. */
	@Input() public hideDisconnectMessage: boolean = false;

	/** @see ChatMessageListComponent.messageCountInTitle */
	@Input() public messageCountInTitle: boolean = false;

	/** @see ChatMessageBoxComponent.messageType */
	@Input() public messageType?: ChatMessageValue.Types =
		ChatMessageValue.Types.Text;

	/** @see ChatMessageListComponent.persistentEndMessage */
	@Input() public persistentEndMessage: boolean = false;

	/** @see ChatMessageListComponent.promptFollowup */
	@Input() public promptFollowup?: string;

	/** @see readableByteLength */
	public readonly readableByteLength = readableByteLength;

	/** @see States */
	public readonly states = States;

	/** @see trackByIndex */
	public readonly trackByIndex = trackByIndex;

	/** @see trackByTransfer */
	public readonly trackByTransfer = trackByTransfer;

	/** Indicates which version of the UI should be displayed. */
	@Input() public uiStyle: UiStyles = UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles = UiStyles;

	/** @see urlToSafeStyle */
	public readonly urlToSafeStyle = urlToSafeStyle;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const $element = $(this.elementRef.nativeElement);

		this.p2pService.init(() => $element.find('.video-call .friend.stream'));
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see FileTransferService */
		public readonly fileTransferService: FileTransferService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see P2PWebRTCService */
		public readonly p2pWebRTCService: P2PWebRTCService,

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
