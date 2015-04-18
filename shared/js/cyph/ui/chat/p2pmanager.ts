/// <reference path="../basebuttonmanager.ts" />
/// <reference path="../elements.ts" />
/// <reference path="../idialogmanager.ts" />
/// <reference path="../isidebar.ts" />
/// <reference path="../../icontroller.ts" />
/// <reference path="../../strings.ts" />
/// <reference path="../../../global/base.ts" />
/// <reference path="../../../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class P2PManager extends BaseButtonManager {
				private dialogManager: IDialogManager;

				public isVideoCall: boolean		= false;
				public isWebRTCEnabled: boolean	= false;

				public p2p: P2P.IP2P;

				public enableWebRTC () {
					this.isWebRTCEnabled	= true;
					this.controller.update();
				}

				public sendFileButton () {
					this.baseButtonClick(() => {
						if (this.isWebRTCEnabled) {
							if (!this.isVideoCall) {
								this.p2p.requestCall('file');
							}
							else {
								this.p2p.sendFile();
							}
						}
					});
				}

				public toggleVideoCall (isVideoCall) {
					this.isVideoCall	= isVideoCall;
					this.controller.update();
				}

				public videoCallButton () {
					this.baseButtonClick(() => {
						if (this.isWebRTCEnabled) {
							if (!this.isVideoCall) {
								this.p2p.requestCall('video');
							}
							else {
								this.p2p.setUpStream({video: !this.p2p.streamOptions.video});
							}
						}
					});
				}

				public videoCallClose () {
					this.baseButtonClick(() => {
						this.p2p.kill();
					});
				}

				public voiceCallButton () {
					this.baseButtonClick(() => {
						if (this.isWebRTCEnabled) {
							if (!this.isVideoCall) {
								this.p2p.requestCall('voice');
							}
							else {
								this.p2p.setUpStream({audio: !this.p2p.streamOptions.audio});
							}
						}
					});
				}

				public webRTCDisabledAlert () {
					/* TODO: let message: string = $('#webrtc-disabled-message').attr('title') */

					this.dialogManager.alert({
						title: Strings.videoCallingTitle,
						content: Strings.webRTCDisabled,
						ok: Strings.ok
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
