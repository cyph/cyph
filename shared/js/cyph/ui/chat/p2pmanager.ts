import {UIEventCategories, UIEvents} from '../../p2p/enums';
import {IP2P} from '../../p2p/ip2p';
import {P2P} from '../../p2p/p2p';
import {events, users} from '../../session/enums';
import {strings} from '../../strings';
import {BaseButtonManager} from '../basebuttonmanager';
import {IDialogManager} from '../idialogmanager';
import {ISidebar} from '../isidebar';
import {IChat} from './ichat';
import {IElements} from './ielements';
import {IP2PManager} from './ip2pmanager';


/** @inheritDoc */
export class P2PManager extends BaseButtonManager implements IP2PManager {
	/** @inheritDoc */
	public isSidebarOpen: boolean;

	/** @inheritDoc */
	public isEnabled: boolean	= false;

	/** @inheritDoc */
	public readonly p2p: IP2P;

	/** @inheritDoc */
	public closeButton () : void {
		this.baseButtonClick(() => this.p2p.close());
	}

	/** @inheritDoc */
	public disabledAlert () : void {
		if (this.chat.isConnected && !this.isEnabled) {
			this.dialogManager.alert({
				content: strings.p2pDisabled,
				ok: strings.ok,
				title: strings.p2pTitle
			});
		}
	}

	/** @inheritDoc */
	public enable () : void {
		this.isEnabled	= true;
	}

	/** @inheritDoc */
	public preemptivelyInitiate () : void {
		this.isEnabled	= true;
		this.p2p.accept();
	}

	/** @inheritDoc */
	public toggleSidebar () : void {
		this.baseButtonClick(() => {
			this.isSidebarOpen	= !this.isSidebarOpen;
		});
	}

	/** @inheritDoc */
	public videoCallButton () : void {
		this.baseButtonClick(() => {
			if (this.isEnabled) {
				if (!this.p2p.isActive) {
					this.p2p.request(P2P.constants.video);
				}
				else {
					this.p2p.toggle(undefined, P2P.constants.video);
				}
			}
		});
	}

	/** @inheritDoc */
	public voiceCallButton () : void {
		this.baseButtonClick(() => {
			if (this.isEnabled) {
				if (!this.p2p.isActive) {
					this.p2p.request(P2P.constants.audio);
				}
				else {
					this.p2p.toggle(undefined, P2P.constants.audio);
				}
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly chat: IChat,

		mobileMenu: () => ISidebar,

		/** @ignore */
		private readonly dialogManager: IDialogManager,

		/** @ignore */
		private readonly elements: IElements,

		forceTURN?: boolean
	) {
		super(mobileMenu);

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
