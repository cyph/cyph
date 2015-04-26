/// <reference path="ip2pmanager.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class P2PManager extends BaseButtonManager implements IP2PManager {
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
					chat: IChat,
					controller: IController,
					mobileMenu: ISidebar,
					private dialogManager: IDialogManager
				) {
					super(controller, mobileMenu);

					this.p2p	= new P2P.P2P(chat.session, this.controller);



					chat.session.on(
						Session.Events.p2pUi,
						(e: {
							category: P2P.UIEvents.Categories;
							event: P2P.UIEvents.Events;
							args: any[];
						}) => {
							switch (e.category) {
								case P2P.UIEvents.Categories.base: {
									switch (e.event) {
										case P2P.UIEvents.Events.connected: {
											let isConnected: boolean	= e.args[0];

											if (isConnected) {
												chat.addMessage(
													Strings.webRTCConnect,
													Session.Authors.app,
													false
												);
											}
											else {
												this.dialogManager.alert({
													title: Strings.videoCallingTitle,
													content: Strings.webRTCDisconnect,
													ok: Strings.ok
												});

												chat.addMessage(
													Strings.webRTCDisconnect,
													Session.Authors.app,
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
											let isVideoCall: boolean	= e.args[0];

											this.toggleVideoCall(isVideoCall);
											break;
										}
									}
									break;
								}
								case P2P.UIEvents.Categories.file: {
									switch (e.event) {
										case P2P.UIEvents.Events.clear: {
											Elements.p2pFiles.each((i: number, elem: HTMLElement) =>
												$(elem).val('')
											);
											break;
										}
										case P2P.UIEvents.Events.confirm: {
											let name: string		= e.args[0];
											let callback: Function	= e.args[1];

											let title: string	= Strings.incomingFile + ' ' + name;

											this.dialogManager.confirm({
												title,
												content: Strings.incomingFileWarning,
												ok: Strings.save,
												cancel: Strings.reject
											}, (ok: boolean) => callback(ok, title));
											break;
										}
										case P2P.UIEvents.Events.get: {
											let callback: Function	= e.args[0];

											let file: File	= Elements.p2pFiles.
												toArray().
												map(($elem) => $elem['files']).
												reduce((a, b) => (a && a[0]) ? a : b, [])[0]
											;

											callback(file);
											break;
										}
										case P2P.UIEvents.Events.rejected: {
											let title: string	= e.args[0];

											this.dialogManager.alert({
												title,
												content: Strings.incomingFileReject,
												ok: Strings.ok
											});
											break;
										}
										case P2P.UIEvents.Events.tooLarge: {
											this.dialogManager.alert({
												title: Strings.oopsTitle,
												content: Strings.fileTooLarge,
												ok: Strings.ok
											});
											break;
										}
										case P2P.UIEvents.Events.transferStarted: {
											let author: Session.Authors	= e.args[0];
											let fileName: string		= e.args[1];

											let isFromMe: boolean	= author === Session.Authors.me;
											let message: string		= isFromMe ?
													Strings.fileTransferInitMe :
													Strings.fileTransferInitFriend
											;

											chat.addMessage(
												message + ' ' + fileName,
												Session.Authors.app,
												!isFromMe
											);
											break;
										}
									}
									break;
								}
								case P2P.UIEvents.Categories.request: {
									switch (e.event) {
										case P2P.UIEvents.Events.acceptConfirm: {
											let callType: string	= e.args[0];
											let timeout: number		= e.args[1];
											let callback: Function	= e.args[2];

											this.dialogManager.confirm({
												title: Strings.videoCallingTitle,
												content:
													Strings.webRTCRequest + ' ' +
													Strings[callType + 'Call'] + '. ' +
													Strings.webRTCWarning
												,
												ok: Strings.continueDialogAction,
												cancel: Strings.decline,
												timeout
											}, (ok: boolean) => callback(ok));
											break;
										}
										case P2P.UIEvents.Events.requestConfirm: {
											let callType: string	= e.args[0];
											let callback: Function	= e.args[1];

											this.dialogManager.confirm({
												title: Strings.videoCallingTitle,
												content:
													Strings.webRTCInit + ' ' +
													Strings[callType + 'Call'] + '. ' +
													Strings.webRTCWarning
												,
												ok: Strings.continueDialogAction,
												cancel: Strings.cancel
											}, (ok: boolean) => callback(ok));
											break;
										}
										case P2P.UIEvents.Events.requestConfirmation: {
											this.dialogManager.alert({
												title: Strings.videoCallingTitle,
												content: Strings.webRTCRequestConfirmation,
												ok: Strings.ok
											});
											break;
										}
										case P2P.UIEvents.Events.requestRejection: {
											this.dialogManager.alert({
												title: Strings.videoCallingTitle,
												content: Strings.webRTCDeny,
												ok: Strings.ok
											});
											break;
										}
									}
									break;
								}
								case P2P.UIEvents.Categories.stream: {
									let author: Session.Authors	= e.args[0];

									let $stream: JQuery	=
										author === Session.Authors.me ?
											Elements.p2pMeStream :
											author === Session.Authors.friend ?
												Elements.p2pFriendStream :
												Elements.p2pFriendPlaceholder
									;

									switch (e.event) {
										case P2P.UIEvents.Events.play: {
											let shouldPlay: boolean	= e.args[1];

											$stream[0][shouldPlay ? 'play' : 'pause']();
											break;
										}
										case P2P.UIEvents.Events.set: {
											let url: string	= e.args[1];

											try {
												URL.revokeObjectURL($stream.attr('src'));
											}
											catch (_) {}

											$stream.attr('src', url);
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
		}
	}
}
