import {Injectable} from '@angular/core';
import {UIEventCategories, UIEvents} from '../p2p/enums';
import {IP2P} from '../p2p/ip2p';
import {P2P} from '../p2p/p2p';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
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
				content: this.stringsService.p2pDisabled,
				ok: this.stringsService.ok,
				title: this.stringsService.p2pTitle
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
			this.sessionService.events.p2pUI,
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
										this.sessionService.users.app,
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
										this.sessionService.users.app,
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
									this.sessionService.users.app,
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

		if (this.preemptivelyInitiated) {
			this.p2p.accept();
		}
	}

	/** @see P2P.isActive */
	public get isActive () : boolean {
		return !!this.p2p && this.p2p.isActive;
	}

	/** @see P2P.isSupported */
	public get isSupported () : boolean {
		return P2P.isSupported;
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

		if (!this.p2p.isActive) {
			this.p2p.request('video');
		}
		else {
			this.p2p.toggle(undefined, 'video');
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
			this.p2p.request('audio');
		}
		else {
			this.p2p.toggle(undefined, 'audio');
		}
	}

	constructor (
		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
