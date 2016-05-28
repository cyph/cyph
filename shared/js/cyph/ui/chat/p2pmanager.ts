import {IChat} from 'ichat';
import {IElements} from 'ielements';
import {IP2PManager} from 'ip2pmanager';
import {BaseButtonManager} from 'ui/basebuttonmanager';
import {IDialogManager} from 'ui/idialogmanager';
import {ISidebar} from 'ui/isidebar';
import {IController} from 'cyph/icontroller';
import {Strings} from 'cyph/strings';
import * as P2P from 'p2p/p2p';
import * as Session from 'session/session';


export class P2PManager extends BaseButtonManager implements IP2PManager {
	public isActive: boolean	= false;
	public isEnabled: boolean	= false;

	public p2p: P2P.IP2P;

	private toggle (isActive: boolean) : void {
		this.isActive	= isActive;
		this.controller.update();
	}

	public closeButton () : void {
		this.baseButtonClick(() => this.p2p.close());
	}

	public disabledAlert () : void {
		if (this.chat.isConnected && !this.isEnabled) {
			this.dialogManager.alert({
				title: Strings.p2pTitle,
				content: Strings.p2pDisabled,
				ok: Strings.ok
			});
		}
	}

	public enable () : void {
		this.isEnabled	= true;
		this.controller.update();
	}

	public isPlaying () : boolean {
		return this.isActive &&
		(
			this.p2p.outgoingStream.video ||
			this.p2p.incomingStream.video ||
			this.p2p.incomingStream.audio
		);
	}

	public preemptivelyInitiate () : void {
		this.isActive	= true;
		this.isEnabled	= true;
		this.p2p.accept();
	}

	public toggleSidebar () : void {
		this.baseButtonClick(() =>
			this.elements.p2pContainer.toggleClass('sidebar-open')
		);
	}

	public videoCallButton () : void {
		this.baseButtonClick(() => {
			if (this.isEnabled) {
				if (!this.isActive) {
					this.p2p.request(P2P.P2P.constants.video);
				}
				else {
					this.p2p.toggle(undefined, P2P.P2P.constants.video);
				}
			}
		});
	}

	public voiceCallButton () : void {
		this.baseButtonClick(() => {
			if (this.isEnabled) {
				if (!this.isActive) {
					this.p2p.request(P2P.P2P.constants.audio);
				}
				else {
					this.p2p.toggle(undefined, P2P.P2P.constants.audio);
				}
			}
		});
	}

	/**
	 * @param chat
	 * @param controller
	 * @param mobileMenu
	 * @param dialogManager
	 */
	public constructor (
		private chat: IChat,
		controller: IController,
		mobileMenu: () => ISidebar,
		private dialogManager: IDialogManager,
		private elements: IElements,
		forceTURN?: boolean
	) {
		super(controller, mobileMenu);

		this.p2p	= new P2P.P2P(
			this.chat.session,
			this.controller,
			forceTURN,
			this.elements.p2pMeStream[0],
			this.elements.p2pFriendStream[0]
		);



		this.chat.session.on(
			Session.Events.p2pUI,
			(e: {
				category: P2P.UIEvents.Categories;
				event: P2P.UIEvents.Events;
				args: any[];
			}) => {
				switch (e.category) {
					case P2P.UIEvents.Categories.base: {
						switch (e.event) {
							case P2P.UIEvents.Events.connected: {
								const isConnected: boolean	= e.args[0];

								if (isConnected) {
									this.chat.addMessage(
										Strings.p2pConnect,
										Session.Users.app,
										false
									);
								}
								else {
									this.dialogManager.alert({
										title: Strings.p2pTitle,
										content: Strings.p2pDisconnect,
										ok: Strings.ok
									});

									this.chat.addMessage(
										Strings.p2pDisconnect,
										Session.Users.app,
										false
									);
								}
								break;
							}
							case P2P.UIEvents.Events.enable: {
								this.enable();
								break;
							}
							case P2P.UIEvents.Events.videoToggle: {
								const isActive: boolean	= e.args[0];

								this.toggle(isActive);
								break;
							}
						}
						break;
					}
					case P2P.UIEvents.Categories.request: {
						switch (e.event) {
							case P2P.UIEvents.Events.acceptConfirm: {
								const callType: string		= e.args[0];
								const timeout: number		= e.args[1];
								const isAccepted: boolean	= e.args[2];
								const callback: Function	= e.args[3];

								if (isAccepted) {
									callback(true);
								}
								else {
									this.dialogManager.confirm({
										title: Strings.p2pTitle,
										content:
											Strings.p2pRequest + ' ' +
											Strings[callType + 'Call'] + '. ' +
											Strings.p2pWarning
										,
										ok: Strings.continueDialogAction,
										cancel: Strings.decline,
										timeout
									}, (ok: boolean) => callback(ok));
								}

								break;
							}
							case P2P.UIEvents.Events.requestConfirm: {
								const callType: string		= e.args[0];
								const isAccepted: boolean	= e.args[1];
								const callback: Function	= e.args[2];

								if (isAccepted) {
									callback(true);
								}
								else {
									this.dialogManager.confirm({
										title: Strings.p2pTitle,
										content:
											Strings.p2pInit + ' ' +
											Strings[callType + 'Call'] + '. ' +
											Strings.p2pWarning
										,
										ok: Strings.continueDialogAction,
										cancel: Strings.cancel
									}, (ok: boolean) => callback(ok));
								}

								break;
							}
							case P2P.UIEvents.Events.requestConfirmation: {
								this.chat.addMessage(
									Strings.p2pRequestConfirmation,
									Session.Users.app,
									false
								);
								break;
							}
							case P2P.UIEvents.Events.requestRejection: {
								this.dialogManager.alert({
									title: Strings.p2pTitle,
									content: Strings.p2pDeny,
									ok: Strings.ok
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
