import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {sleep} from '../util/wait';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';


/**
 * Manages P2P sessions.
 */
@Injectable()
export class P2PService extends BaseProvider {
	/** @ignore */
	protected readonly handlers: IP2PHandlers	= {
		acceptConfirm: async (callType, timeout, isAccepted) => {
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
					this.p2pWarning
				} ${
					this.stringsService.continuePrompt
				}`,
				markdown: true,
				ok: this.stringsService.continueDialogAction,
				timeout,
				title: this.stringsService.p2pTitle
			});
		},
		audioDefaultEnabled: () => !this.chatService.walkieTalkieMode.value,
		canceled: async () => {
			await this.dialogService.alert({
				content: this.stringsService.p2pCanceled,
				title: this.stringsService.p2pTitle
			});
		},
		connected: async isConnected => {
			if (isConnected) {
				await this.chatService.addMessage({
					shouldNotify: false,
					value: this.stringsService.p2pConnect
				});
			}
			else {
				await Promise.all([
					this.dialogService.alert({
						content: this.stringsService.p2pDisconnect,
						title: this.stringsService.p2pTitle
					}),
					this.chatService.addMessage({
						shouldNotify: false,
						value: this.stringsService.p2pDisconnect
					})
				]);
			}
		},
		loaded: async () => {
			if (!this.sessionInitService.ephemeral) {
				this.chatService.initProgressFinish();
				await sleep(1000);
			}
		},
		localVideoConfirm: async video => {
			return this.dialogService.confirm({
				content: `${
					this.stringsService.allow
				} ${
					video ? this.stringsService.camera : this.stringsService.mic
				} ${
					this.stringsService.allow
				}?`,
				title: this.stringsService.p2pTitle
			});
		},
		requestConfirm: async (callType, isAccepted) => {
			if (isAccepted) {
				return true;
			}

			return this.dialogService.confirm({
				content: `${
					this.stringsService.p2pInit
				} ${
					<string> (
						(<any> this.stringsService)[callType + 'Call'] ||
						''
					)
				}. ${
					this.p2pWarning
				} ${
					this.stringsService.continuePrompt
				}`,
				markdown: true,
				ok: this.stringsService.continueDialogAction,
				title: this.stringsService.p2pTitle
			});
		},
		requestConfirmation: async () => {
			await this.chatService.addMessage({
				shouldNotify: false,
				value: this.stringsService.p2pRequestConfirmation
			});
		},
		requestRejection: async () => {
			await this.dialogService.alert({
				content: this.stringsService.p2pDeny,
				title: this.stringsService.p2pTitle
			});
		}
	};

	/** @see P2PWebRTCService.isActive */
	public readonly isActive				= this.p2pWebRTCService.isActive;

	/** Is active or has initial call type. */
	public readonly isActiveOrInitialCall	= this.isActive.pipe(map(isActive =>
		isActive || this.sessionInitService.callType !== undefined
	));

	/** Indicates whether P2P is possible (i.e. both clients support WebRTC). */
	public readonly isEnabled				= new BehaviorSubject<boolean>(false);

	/** Indicates whether sidebar is open. */
	public readonly isSidebarOpen			= new BehaviorSubject<boolean>(false);

	/** @ignore */
	private get p2pWarning () : string {
		return this.envService.showAds ?
			this.stringsService.p2pWarningVPN :
			this.stringsService.p2pWarning
		;
	}

	/** @see P2PWebRTCService.request */
	protected async request (callType: 'audio'|'video') : Promise<void> {
		await this.p2pWebRTCService.request(callType);
	}

	/** Close active P2P session. */
	public async closeButton () : Promise<void> {
		if (!this.sessionInitService.ephemeral || this.sessionInitService.callType === undefined) {
			await this.p2pWebRTCService.close();
		}
		else {
			await this.chatService.disconnectButton();
		}
	}

	/** If chat authentication is complete, alert that P2P is disabled. */
	public async disabledAlert () : Promise<void> {
		if (this.chatService.chat.isConnected && !this.isEnabled.value) {
			await this.dialogService.alert({
				content: this.stringsService.p2pDisabled,
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

		this.isEnabled.next(await this.sessionCapabilitiesService.capabilities.p2p);
	}

	/** Toggle window of sidebar containing chat UI. */
	public toggleSidebar () : void {
		this.isSidebarOpen.next(!this.isSidebarOpen.value);
	}

	/**
	 * Attempt to toggle outgoing video stream,
	 * requesting new P2P session if necessary.
	 */
	public async videoCallButton () : Promise<void> {
		if (!this.isEnabled.value) {
			return;
		}

		if (!this.p2pWebRTCService.isActive.value) {
			await this.request('video');
		}
		else if (this.p2pWebRTCService.videoEnabled.value) {
			await this.p2pWebRTCService.toggle('video');
		}
	}

	/**
	 * Attempt to toggle outgoing audio stream,
	 * requesting new P2P session if necessary.
	 */
	public async voiceCallButton () : Promise<void> {
		if (!this.isEnabled.value) {
			return;
		}

		if (!this.p2pWebRTCService.isActive.value) {
			await this.request('audio');
		}
		else {
			await this.p2pWebRTCService.toggle('audio');
		}
	}

	constructor (
		/** @ignore */
		protected readonly chatService: ChatService,

		/** @ignore */
		protected readonly dialogService: DialogService,

		/** @ignore */
		protected readonly envService: EnvService,

		/** @ignore */
		protected readonly p2pWebRTCService: P2PWebRTCService,

		/** @ignore */
		protected readonly sessionCapabilitiesService: SessionCapabilitiesService,

		/** @ignore */
		protected readonly sessionInitService: SessionInitService,

		/** @ignore */
		protected readonly stringsService: StringsService
	) {
		super();

		this.chatService.p2pService.resolve(this);
	}
}
