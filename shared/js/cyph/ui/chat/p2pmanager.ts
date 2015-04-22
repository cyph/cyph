/// <reference path="ip2pmanager.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class P2PManager extends BaseButtonManager implements IP2PManager {
				private dialogManager: IDialogManager;

				public isEnabled: boolean	= false;
				public isVideoCall: boolean	= false;

				public p2p: P2P.IP2P;

				public disabledAlert (isConnected: boolean) : void {
					if (isConnected && !this.isEnabled) {
						this.dialogManager.alert({
							title: Strings.videoCallingTitle,
							content: Strings.webRTCDisabled,
							ok: Strings.ok
						});
					}
				}

				public enable () : void {
					this.isEnabled	= true;
					this.controller.update();
				}

				public sendFileButton () : void {
					this.baseButtonClick(() => {
						if (this.isEnabled) {
							if (!this.isVideoCall) {
								this.p2p.requestCall('file');
							}
							else {
								this.p2p.sendFile();
							}
						}
					});
				}

				public toggleVideoCall (isVideoCall: boolean) : void {
					this.isVideoCall	= isVideoCall;
					this.controller.update();
				}

				public videoCallButton () : void {
					this.baseButtonClick(() => {
						if (this.isEnabled) {
							if (!this.isVideoCall) {
								this.p2p.requestCall('video');
							}
							else {
								this.p2p.setUpStream({video: !this.p2p.streamOptions.video});
							}
						}
					});
				}

				public videoCallClose () : void {
					this.baseButtonClick(() => this.p2p.kill());
				}

				public voiceCallButton () : void {
					this.baseButtonClick(() => {
						if (this.isEnabled) {
							if (!this.isVideoCall) {
								this.p2p.requestCall('voice');
							}
							else {
								this.p2p.setUpStream({audio: !this.p2p.streamOptions.audio});
							}
						}
					});
				}

				public constructor (
					session: Session.ISession,
					controller: IController,
					mobileMenu: ISidebar,
					dialogManager: IDialogManager
				) {
					super(controller, mobileMenu);

					this.dialogManager	= dialogManager;

					this.p2p			= new P2P.P2P(session, this.controller);
				}
			}
		}
	}
}
