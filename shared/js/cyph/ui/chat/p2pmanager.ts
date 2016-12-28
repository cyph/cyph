import {UIEventCategories, UIEvents} from '../../p2p/enums';
import {IP2P} from '../../p2p/ip2p';
import {P2P} from '../../p2p/p2p';
import {events, users} from '../../session/enums';
import {strings} from '../../strings';
import {DialogManager} from '../dialogmanager';
import {Chat} from './chat';
import {IElements} from './ielements';


/**
 * Represents P2P component of chat UI.
 */
export class P2PManager {
	/** Indicates whether sidebar is open. */
	public isSidebarOpen: boolean;

	/** Indicates whether P2P is possible (i.e. both clients support WebRTC). */
	public isEnabled: boolean	= false;

	/** @see IP2P */
	public readonly p2p: IP2P;

	/**
	 * Closes active P2P session.
	 */
	public closeButton () : void {
		this.p2p.close();
	}

	/**
	 * If chat authentication is complete, this alerts that P2P is disabled.
	 */
	public disabledAlert () : void {
		if (this.chat.isConnected && !this.isEnabled) {
			this.dialogManager.alert({
				content: strings.p2pDisabled,
				ok: strings.ok,
				title: strings.p2pTitle
			});
		}
	}

	/**
	 * Sets this.isEnabled to true.
	 */
	public enable () : void {
		this.isEnabled	= true;
	}

	/**
	 * Preemptively initiates call, bypassing any prerequisite dialogs and button clicks.
	 */
	public preemptivelyInitiate () : void {
		this.isEnabled	= true;
		this.p2p.accept();
	}

	/**
	 * Toggles visibility of sidebar containing chat UI.
	 */
	public toggleSidebar () : void {
		this.isSidebarOpen	= !this.isSidebarOpen;
	}

	/**
	 * Attempts to toggle outgoing video stream,
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
	 * Attempts to toggle outgoing audio stream,
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
		private readonly chat: Chat,

		/** @ignore */
		private readonly dialogManager: DialogManager,

		/** @ignore */
		private readonly elements: IElements,

		forceTURN: boolean = false
	) {
		this.p2p	= new P2P(
			this.chat.session,
			forceTURN,
			this.elements.p2pMeStream,
			this.elements.p2pFriendStream
		);

		this.chat.session.on(
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
									this.chat.addMessage(
										strings.p2pConnect,
										users.app,
										undefined,
										false
									);
								}
								else {
									this.dialogManager.alert({
										content: strings.p2pDisconnect,
										ok: strings.ok,
										title: strings.p2pTitle
									});

									this.chat.addMessage(
										strings.p2pDisconnect,
										users.app,
										undefined,
										false
									);
								}
								break;
							}
							case UIEvents.enable: {
								this.enable();
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
									callback(await this.dialogManager.confirm({
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
									callback(await this.dialogManager.confirm({
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
								this.chat.addMessage(
									strings.p2pRequestConfirmation,
									users.app,
									undefined,
									false
								);
								break;
							}
							case UIEvents.requestRejection: {
								this.dialogManager.alert({
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
}
