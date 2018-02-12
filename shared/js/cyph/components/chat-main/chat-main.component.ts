import {AfterViewInit, Component, ElementRef, Input} from '@angular/core';
import * as $ from 'jquery';
import {fadeIn} from '../../animations';
import {States, UiStyles} from '../../chat/enums';
import {ChatMessageValue} from '../../proto';
import {ChatService} from '../../services/chat.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {P2PService} from '../../services/p2p.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {trackByTransfer} from '../../track-by/track-by-transfer';
import {readableByteLength} from '../../util/formatting';


/**
 * Angular component for main chat UI.
 */
@Component({
	animations: [fadeIn],
	selector: 'cyph-chat-main',
	styleUrls: ['./chat-main.component.scss'],
	templateUrl: './chat-main.component.html'
})
export class ChatMainComponent implements AfterViewInit {
	/** Indicates whether this is the accounts UI. */
	@Input() public accounts: boolean	= false;

	/** Indicates whether projected disconnection message should be hidden. */
	@Input() public hideDisconnectMessage: boolean					= false;

	/** @see ChatMessageListComponent.messageCountInTitle */
	@Input() public messageCountInTitle: boolean					= false;

	/** @see ChatMessageBoxComponent.messageType */
	@Input() public messageType: ChatMessageValue.Types				= ChatMessageValue.Types.Text;

	/** @see ChatMessageListComponent.persistentEndMessage */
	@Input() public persistentEndMessage: boolean					= false;

	/** @see ChatMessageListComponent.promptFollowup */
	@Input() public promptFollowup?: string;

	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	/** @see States */
	public readonly states: typeof States							= States;

	/** @see trackByTransfer */
	public readonly trackByTransfer: typeof trackByTransfer			= trackByTransfer;

	/** Indicates which version of the UI should be displayed. */
	@Input() public uiStyle: UiStyles								= UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles: typeof UiStyles						= UiStyles;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const $element	= $(this.elementRef.nativeElement);

		this.p2pService.init(
			() => $element.find('.video-call .me'),
			() => $element.find('.video-call .friend.stream')
		);
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

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
