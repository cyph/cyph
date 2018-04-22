import {Injectable} from '@angular/core';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {sleep} from '../util/wait';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';


/**
 * Manages P2P sessions.
 */
@Injectable()
export class P2PService {
	/** @ignore */
	private readonly handlers: IP2PHandlers	= {
		acceptConfirm: async (callType: string, timeout: number, isAccepted: boolean) => {
			if (isAccepted) {
				return true;
			}

			return this.dialogService.confirm({
				cancel: this.stringsService.decline,
				content: `${
					this.stringsService.p2pRequest
				} ${
					<string> (
						(<any> this.stringsService)[callType + 'Call'] ||
						''
					)
				}. ${
					this.stringsService.p2pWarning
				}`,
				ok: this.stringsService.continueDialogAction,
				timeout,
				title: this.stringsService.p2pTitle
			});
		},
		audioDefaultEnabled: () => !this.chatService.walkieTalkieMode,
		canceled: () => {
			this.dialogService.alert({
				content: this.stringsService.p2pCanceled,
				ok: this.stringsService.ok,
				title: this.stringsService.p2pTitle
			});
		},
		connected: (isConnected: boolean) => {
			if (isConnected) {
				this.chatService.addMessage(
					this.stringsService.p2pConnect,
					undefined,
					undefined,
					false
				);
			}
			else {
				this.dialogService.alert({
					content: this.stringsService.p2pDisconnect,
					ok: this.stringsService.ok,
					title: this.stringsService.p2pTitle
				});

				this.chatService.addMessage(
					this.stringsService.p2pDisconnect,
					undefined,
					undefined,
					false
				);
			}
		},
		loaded: async () => {
			if (!this.sessionInitService.ephemeral) {
				this.chatService.initProgressFinish();
				await sleep(1000);
			}
		},
		requestConfirm: async (callType: string, isAccepted: boolean) => {
			if (isAccepted) {
				return true;
			}

			return this.dialogService.confirm({
				cancel: this.stringsService.cancel,
				content: `${
					this.stringsService.p2pInit
				} ${
					<string> (
						(<any> this.stringsService)[callType + 'Call'] ||
						''
					)
				}. ${
					this.stringsService.p2pWarning
				}`,
				ok: this.stringsService.continueDialogAction,
				title: this.stringsService.p2pTitle
			});
		},
		requestConfirmation: () => {
			this.chatService.addMessage(
				this.stringsService.p2pRequestConfirmation,
				undefined,
				undefined,
				false
			);
		},
		requestRejection: () => {
			this.dialogService.alert({
				content: this.stringsService.p2pDeny,
				ok: this.stringsService.ok,
				title: this.stringsService.p2pTitle
			});
		}
	};

	/** Indicates whether P2P is possible (i.e. both clients support WebRTC). */
	public isEnabled: boolean		= false;

	/** Indicates whether sidebar is open. */
	public isSidebarOpen: boolean	= false;

	/** @see P2PWebRTCService.request */
	protected async request (callType: 'audio'|'video') : Promise<void> {
		await this.p2pWebRTCService.request(callType);
	}

	/** Close active P2P session. */
	public closeButton () : void {
		if (!this.sessionInitService.ephemeral || this.sessionInitService.callType === undefined) {
			this.p2pWebRTCService.close();
		}
		else {
			this.chatService.disconnectButton();
		}
	}

	/** If chat authentication is complete, alert that P2P is disabled. */
	public disabledAlert () : void {
		if (this.chatService.chat.isConnected && !this.isEnabled) {
			this.dialogService.alert({
				content: this.stringsService.p2pDisabled,
				ok: this.stringsService.ok,
				title: this.stringsService.p2pTitle
			});
		}
	}

	/** Initializes service. */
	public async init (
		localVideo: () => JQuery,
		remoteVideo: () => JQuery
	) : Promise<void> {
		this.p2pWebRTCService.init(this.chatService, this.handlers, localVideo, remoteVideo);

		this.isEnabled	= (await this.sessionCapabilitiesService.capabilities).p2p;
	}

	/** @see P2PWebRTCService.isActive */
	public get isActive () : boolean {
		return this.p2pWebRTCService.isActive;
	}

	/** Is active or has initial call type. */
	public get isActiveOrInitialCall () : boolean {
		return this.isActive || this.sessionInitService.callType !== undefined;
	}

	/** Toggle window of sidebar containing chat UI. */
	public toggleSidebar () : void {
		this.isSidebarOpen	= !this.isSidebarOpen;
	}

	/**
	 * Attempt to toggle outgoing video stream,
	 * requesting new P2P session if necessary.
	 */
	public videoCallButton () : void {
		if (!this.isEnabled) {
			return;
		}

		if (!this.p2pWebRTCService.isActive) {
			this.request('video');
		}
		else if (this.p2pWebRTCService.videoEnabled) {
			this.p2pWebRTCService.toggle('video');
		}
	}

	/**
	 * Attempt to toggle outgoing audio stream,
	 * requesting new P2P session if necessary.
	 */
	public voiceCallButton () : void {
		if (!this.isEnabled) {
			return;
		}

		if (!this.p2pWebRTCService.isActive) {
			this.request('audio');
		}
		else {
			this.p2pWebRTCService.toggle('audio');
		}
	}

	constructor (
		/** @ignore */
		protected readonly chatService: ChatService,

		/** @ignore */
		protected readonly dialogService: DialogService,

		/** @ignore */
		protected readonly p2pWebRTCService: P2PWebRTCService,

		/** @ignore */
		protected readonly sessionCapabilitiesService: SessionCapabilitiesService,

		/** @ignore */
		protected readonly sessionInitService: SessionInitService,

		/** @ignore */
		protected readonly stringsService: StringsService
	) {}
}
