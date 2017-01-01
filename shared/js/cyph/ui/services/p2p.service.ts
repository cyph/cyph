import {Injectable} from '@angular/core';
import {UIEventCategories, UIEvents} from '../../p2p/enums';
import {IP2P} from '../../p2p/ip2p';
import {P2P} from '../../p2p/p2p';
import {events, users} from '../../session/enums';
import {strings} from '../../strings';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
import {SessionService} from './session.service';


/**
 * Manages P2P sessions.
 */
@Injectable()
export class P2PService {
	/** Indicates whether sidebar is open. */
	public isSidebarOpen: boolean;

	/** Indicates whether P2P is possible (i.e. both clients support WebRTC). */
	public isEnabled: boolean	= false;

	/** @see IP2P */
	public p2p: IP2P;

	/** Close active P2P session. */
	public closeButton () : void {
		this.p2p.close();
	}

	/** If chat authentication is complete, alert that P2P is disabled. */
	public disabledAlert () : void {
		if (this.chatService.isConnected && !this.isEnabled) {
			this.dialogService.alert({
				content: strings.p2pDisabled,
				ok: strings.ok,
				title: strings.p2pTitle
			});
		}
	}

	/** Initialise service. */
	public init (localVideo: () => JQuery, remoteVideo: () => JQuery) : void {
		this.p2p	= new P2P(
			this.sessionService,
			this.sessionService.apiFlags.forceTURN,
			localVideo,
			remoteVideo
		);

		this.sessionService.on(
			events.p2pUI,
			async (e: {
				category: UIEventCategories;
				event: UIEvents;
				args: any[];
			}) => {
				switch (e.category) {
					case UIEventCategories.base: {
						switch (e.event) {
							case UIEvents.connected: {
								const isConnected: boolean	= e.args[0];

								if (isConnected) {
									this.chatService.addMessage(
										strings.p2pConnect,
										users.app,
										undefined,
										false
									);
								}
								else {
									this.dialogService.alert({
										content: strings.p2pDisconnect,
										ok: strings.ok,
										title: strings.p2pTitle
									});

									this.chatService.addMessage(
										strings.p2pDisconnect,
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
										cancel: strings.decline,
										content: `${
											strings.p2pRequest
										} ${
											<string> ((<any> strings)[callType + 'Call'] || '')
										}. ${
											strings.p2pWarning
										}`,
										ok: strings.continueDialogAction,
										title: strings.p2pTitle
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
										cancel: strings.cancel,
										content: `${
											strings.p2pInit
										} ${
											<string> ((<any> strings)[callType + 'Call'] || '')
										}. ${
											strings.p2pWarning
										}`,
										ok: strings.continueDialogAction,
										title: strings.p2pTitle
									}));
								}

								break;
							}
							case UIEvents.requestConfirmation: {
								this.chatService.addMessage(
									strings.p2pRequestConfirmation,
									users.app,
									undefined,
									false
								);
								break;
							}
							case UIEvents.requestRejection: {
								this.dialogService.alert({
									content: strings.p2pDeny,
									ok: strings.ok,
									title: strings.p2pTitle
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

	/** Preemptively initiate call, bypassing any prerequisite dialogs and button clicks. */
	public preemptivelyInitiate () : void {
		this.isEnabled	= true;
		this.p2p.accept();
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

		if (!this.p2p.isActive) {
			this.p2p.request(P2P.constants.video);
		}
		else {
			this.p2p.toggle(undefined, P2P.constants.video);
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

		if (!this.p2p.isActive) {
			this.p2p.request(P2P.constants.audio);
		}
		else {
			this.p2p.toggle(undefined, P2P.constants.audio);
		}
	}

	constructor (
		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {}
}
