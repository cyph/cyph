import {UIEventCategories, UIEvents} from '../../p2p/enums';
import {IP2P} from '../../p2p/ip2p';
import {P2P} from '../../p2p/p2p';
import {Events, Users} from '../../session/enums';
import {Strings} from '../../strings';
import {BaseButtonManager} from '../basebuttonmanager';
import {IDialogManager} from '../idialogmanager';
import {ISidebar} from '../isidebar';
import {IChat} from './ichat';
import {IElements} from './ielements';
import {IP2PManager} from './ip2pmanager';


/** @inheritDoc */
export class P2PManager extends BaseButtonManager implements IP2PManager {
	/** @inheritDoc */
	public isEnabled: boolean	= false;

	/** @inheritDoc */
	public p2p: IP2P;

	/** @inheritDoc */
	public closeButton () : void {
		this.baseButtonClick(() => this.p2p.close());
	}

	/** @inheritDoc */
	public disabledAlert () : void {
		if (this.chat.isConnected && !this.isEnabled) {
			this.dialogManager.alert({
				content: Strings.p2pDisabled,
				ok: Strings.ok,
				title: Strings.p2pTitle
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
		this.baseButtonClick(() =>
			this.elements.p2pContainer().toggleClass('sidebar-open')
		);
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
		private chat: IChat,

		mobileMenu: () => ISidebar,

		/** @ignore */
		private dialogManager: IDialogManager,

		/** @ignore */
		private elements: IElements,

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
			Events.p2pUI,
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
										Strings.p2pConnect,
										Users.app,
										undefined,
										false
									);
								}
								else {
									this.dialogManager.alert({
										content: Strings.p2pDisconnect,
										ok: Strings.ok,
										title: Strings.p2pTitle
									});

									this.chat.addMessage(
										Strings.p2pDisconnect,
										Users.app,
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
										cancel: Strings.decline,
										content: `${
											Strings.p2pRequest
										} ${
											<string> (Strings[callType + 'Call'] || '')
										}. ${
											Strings.p2pWarning
										}`,
										ok: Strings.continueDialogAction,
										title: Strings.p2pTitle
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
										cancel: Strings.cancel,
										content: `${
											Strings.p2pInit
										} ${
											<string> (Strings[callType + 'Call'] || '')
										}. ${
											Strings.p2pWarning
										}`,
										ok: Strings.continueDialogAction,
										title: Strings.p2pTitle
									}));
								}

								break;
							}
							case UIEvents.requestConfirmation: {
								this.chat.addMessage(
									Strings.p2pRequestConfirmation,
									Users.app,
									undefined,
									false
								);
								break;
							}
							case UIEvents.requestRejection: {
								this.dialogManager.alert({
									content: Strings.p2pDeny,
									ok: Strings.ok,
									title: Strings.p2pTitle
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
