/// <reference path="ip2pmanager.ts" />


module Cyph {
	export module UI {
		export module Chat {
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

				public sendFileButton () : void {
					this.baseButtonClick(() => {
						if (this.isEnabled) {
							if (!this.isActive) {
								this.p2p.requestCall('file');
							}
							else {
								this.p2p.sendFile();
							}
						}
					});
				}

				public videoCallButton () : void {
					this.baseButtonClick(() => {
						if (this.isEnabled) {
							if (!this.isActive) {
								this.p2p.requestCall('video');
							}
							else {
								this.p2p.setUpStream({video: !this.p2p.outgoingStream.video});
							}
						}
					});
				}

				public voiceCallButton () : void {
					this.baseButtonClick(() => {
						if (this.isEnabled) {
							if (!this.isActive) {
								this.p2p.requestCall('voice');
							}
							else {
								this.p2p.setUpStream({audio: !this.p2p.outgoingStream.audio});
							}
						}
					});
				}

				public constructor (
					private chat: IChat,
					controller: IController,
					mobileMenu: ISidebar,
					private dialogManager: IDialogManager
				) {
					super(controller, mobileMenu);

					this.p2p	= new P2P.P2P(this.chat.session, this.controller);



					this.chat.session.on(
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
								case P2P.UIEvents.Categories.file: {
									switch (e.event) {
										case P2P.UIEvents.Events.clear: {
											Elements.p2pFiles.each((i: number, elem: HTMLElement) =>
												$(elem).val('')
											);
											break;
										}
										case P2P.UIEvents.Events.confirm: {
											const name: string			= e.args[0];
											const callback: Function	= e.args[1];

											const title: string	= Strings.incomingFile + ' ' + name;

											this.dialogManager.confirm({
												title,
												content: Strings.incomingFileWarning,
												ok: Strings.save,
												cancel: Strings.reject
											}, (ok: boolean) => callback(ok, title));
											break;
										}
										case P2P.UIEvents.Events.get: {
											const callback: Function	= e.args[0];

											const file: File	= Elements.p2pFiles.
												toArray().
												map((elem: HTMLInputElement) => elem.files || []).
												reduce((a: File, b: FileList) => a || b[0], null)
											;

											callback(file);
											break;
										}
										case P2P.UIEvents.Events.rejected: {
											const title: string	= e.args[0];

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
											const user: Session.Users	= e.args[0];
											const fileName: string		= e.args[1];

											const isFromMe: boolean	= user === Session.Users.me;
											const message: string	=
												isFromMe ?
													Strings.fileTransferInitMe :
													Strings.fileTransferInitFriend
											;

											this.chat.addMessage(
												message + ' ' + fileName,
												Session.Users.app,
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
											const callType: string		= e.args[0];
											const timeout: number		= e.args[1];
											const callback: Function	= e.args[2];

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
											break;
										}
										case P2P.UIEvents.Events.requestConfirm: {
											const callType: string		= e.args[0];
											const callback: Function	= e.args[1];

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
											break;
										}
										case P2P.UIEvents.Events.requestConfirmation: {
											this.dialogManager.alert({
												title: Strings.p2pTitle,
												content: Strings.p2pRequestConfirmation,
												ok: Strings.ok
											});
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
								case P2P.UIEvents.Categories.stream: {
									const user: Session.Users	= e.args[0];

									const $stream: JQuery	=
										user === Session.Users.me ?
											Elements.p2pMeStream :
											user === Session.Users.friend ?
												Elements.p2pFriendStream :
												Elements.p2pFriendPlaceholder
									;

									switch (e.event) {
										case P2P.UIEvents.Events.play: {
											const shouldPlay: boolean	= e.args[1];

											$stream[0][shouldPlay ? 'play' : 'pause']();
											break;
										}
										case P2P.UIEvents.Events.set: {
											const url: string	= e.args[1];

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
