import {Injectable} from '@angular/core';
import {UIEventCategories, UIEvents} from '../p2p/enums';
import {events, users} from '../session/enums';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Manages P2P sessions.
 */
@Injectable()
export class P2PService {
	/** @ignore */
	private preemptivelyInitiated: boolean;

	/** Indicates whether P2P is possible (i.e. both clients support WebRTC). */
	public isEnabled: boolean	= false;

	/** Indicates whether sidebar is open. */
	public isSidebarOpen: boolean;

	/** Close active P2P session. */
	public closeButton () : void {
		this.p2pWebRTCService.close();
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

	/** Initialise service. */
	public init (localVideo: () => JQuery, remoteVideo: () => JQuery) : void {
		this.p2pWebRTCService.init(localVideo, remoteVideo);

		if (this.preemptivelyInitiated) {
			this.p2pWebRTCService.accept();
		}
	}

	/** @see P2P.isActive */
	public get isActive () : boolean {
		return !!this.p2pWebRTCService && this.p2pWebRTCService.isActive;
	}

	/** @see P2P.isSupported */
	public get isSupported () : boolean {
		return P2PWebRTCService.isSupported;
	}

	/** Preemptively initiate call, bypassing any prerequisite dialogs and button clicks. */
	public preemptivelyInitiate () : void {
		this.preemptivelyInitiated	= true;
	}

	/** Toggle visibility of sidebar containing chat UI. */
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
			this.p2pWebRTCService.request('video');
		}
		else {
			this.p2pWebRTCService.toggle(undefined, 'video');
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
			this.p2pWebRTCService.request('audio');
		}
		else {
			this.p2pWebRTCService.toggle(undefined, 'audio');
		}
	}

	constructor (
		sessionService: SessionService,

		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly p2pWebRTCService: P2PWebRTCService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		sessionService.on(
			events.p2pUI,
			async (e: {
				args: any[];
				category: UIEventCategories;
				event: UIEvents;
			}) => {
				switch (e.category) {
					case UIEventCategories.base: {
						switch (e.event) {
							case UIEvents.connected: {
								const isConnected: boolean	= e.args[0];

								if (isConnected) {
									this.chatService.addMessage(
										this.stringsService.p2pConnect,
										users.app,
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
										users.app,
										undefined,
										false
									);
								}
								break;
							}
							case UIEvents.enable: {
								this.isEnabled	= true;
								break;
							}
						}
						break;
					}
					case UIEventCategories.request: {
						switch (e.event) {
							case UIEvents.acceptConfirm: {
								const callType: string		= e.args[0];
								const timeout: number		= e.args[1];
								const isAccepted: boolean	= e.args[2];
								const callback: Function	= e.args[3];

								if (isAccepted) {
									callback(true);
								}
								else {
									callback(await this.dialogService.confirm({
										timeout,
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
										title: this.stringsService.p2pTitle
									}));
								}

								break;
							}
							case UIEvents.requestConfirm: {
								const callType: string		= e.args[0];
								const isAccepted: boolean	= e.args[1];
								const callback: Function	= e.args[2];

								if (isAccepted) {
									callback(true);
								}
								else {
									callback(await this.dialogService.confirm({
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
									}));
								}

								break;
							}
							case UIEvents.requestConfirmation: {
								this.chatService.addMessage(
									this.stringsService.p2pRequestConfirmation,
									users.app,
									undefined,
									false
								);
								break;
							}
							case UIEvents.requestRejection: {
								this.dialogService.alert({
									content: this.stringsService.p2pDeny,
									ok: this.stringsService.ok,
									title: this.stringsService.p2pTitle
								});
								break;
							}
						}
						break;
					}
				}
			}
		);
	}
}
