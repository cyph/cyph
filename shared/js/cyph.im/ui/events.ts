/// <reference path="ui.ts" />
/// <reference path="../../cyph/strings.ts" />
/// <reference path="../../cyph/p2p/p2p.ts" />
/// <reference path="../../cyph/session/enums.ts" />
/// <reference path="../../cyph/session/isession.ts" />
/// <reference path="../../cyph/ui/elements.ts" />
/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/jquery/jquery.d.ts" />


module Cyph.im {
	export module UI {
		export let events	= (session: Cyph.Session.ISession) : void => {
			/* Main session events */

			session.on(Cyph.Session.Events.abort, () =>
				Cyph.UI.Elements.window.off('beforeunload')
			);

			session.on(Cyph.Session.Events.beginChat, () =>
				beginChatUi(() =>
					Cyph.UI.Elements.window.
						unload(() => session.close()).
						on('beforeunload', () => Cyph.Strings.disconnectWarning)
				)
			);

			session.on(Cyph.Session.Events.beginWaiting, beginWaiting);

			session.on(Cyph.Session.Events.closeChat, closeChat);

			session.on(Cyph.Session.Events.cyphertext,
				(o: { cyphertext: string; author: Cyph.Session.Authors; }) =>
					logCyphertext(o.cyphertext, o.author)
			);

			session.on(Cyph.Session.Events.newCyph, () => changeState(states.spinningUp));

			session.on(Cyph.Session.Events.smp, (wasSuccessful: boolean) => {
				if (wasSuccessful) {
					markAllAsSent();
				}
				else {
					abortSetup();
				}
			});

			session.on(Cyph.Session.Events.text,
				(o: { text: string; author: Cyph.Session.Authors; }) =>
					addMessageToChat(o.text, o.author, o.author !== Cyph.Session.Authors.me)
			);

			session.on(Cyph.Session.Events.typing, friendIsTyping);


			/* P2P events */

			session.on(
				Cyph.Session.Events.p2pUi,
				(e: {
					category: Cyph.P2P.UIEvents.Categories;
					event: Cyph.P2P.UIEvents.Events;
					args: any[];
				}) => {
					switch (e.category) {
						case Cyph.P2P.UIEvents.Categories.base: {
							switch (e.event) {
								case Cyph.P2P.UIEvents.Events.connected: {
									let isConnected: boolean	= e.args[0];

									if (isConnected) {
										addMessageToChat(
											Cyph.Strings.webRTCConnect,
											Cyph.Session.Authors.app,
											false
										);
									}
									else {
										alertDialog({
											title: Cyph.Strings.videoCallingTitle,
											content: Cyph.Strings.webRTCDisconnect,
											ok: Cyph.Strings.ok
										});

										addMessageToChat(
											Cyph.Strings.webRTCDisconnect,
											Cyph.Session.Authors.app,
											false
										);
									}
									break;
								}
								case Cyph.P2P.UIEvents.Events.enable: {
									enableWebRTC();
									break;
								}
								case Cyph.P2P.UIEvents.Events.videoToggle: {
									let isVideoCall: boolean	= e.args[0];

									toggleVideoCall(isVideoCall);
									break;
								}
							}
							break;
						}
						case Cyph.P2P.UIEvents.Categories.file: {
							switch (e.event) {
								case Cyph.P2P.UIEvents.Events.clear: {
									Cyph.UI.Elements.p2pFiles.each((i: number, elem: HTMLElement) =>
										$(elem).val('')
									);
									break;
								}
								case Cyph.P2P.UIEvents.Events.confirm: {
									let name: string		= e.args[0];
									let callback: Function	= e.args[1];

									let title: string	= Cyph.Strings.incomingFile + ' ' + name;

									confirmDialog({
										title: title,
										content: Cyph.Strings.incomingFileWarning,
										ok: Cyph.Strings.save,
										cancel: Cyph.Strings.reject
									}, (ok: boolean) => callback(ok, title));
									break;
								}
								case Cyph.P2P.UIEvents.Events.get: {
									let callback: Function	= e.args[0];

									let file: File	= Cyph.UI.Elements.p2pFiles.
										toArray().
										map(($elem) => $elem['files']).
										reduce((a, b) => (a && a[0]) ? a : b, [])[0]
									;

									callback(file);
									break;
								}
								case Cyph.P2P.UIEvents.Events.rejected: {
									let title: string	= e.args[0];

									alertDialog({
										title: title,
										content: Cyph.Strings.incomingFileReject,
										ok: Cyph.Strings.ok
									});
									break;
								}
								case Cyph.P2P.UIEvents.Events.tooLarge: {
									alertDialog({
										title: Cyph.Strings.oopsTitle,
										content: Cyph.Strings.fileTooLarge,
										ok: Cyph.Strings.ok
									});
									break;
								}
								case Cyph.P2P.UIEvents.Events.transferStarted: {
									let author: Cyph.Session.Authors	= e.args[0];
									let fileName: string				= e.args[1];

									let isFromMe: boolean	= author === Cyph.Session.Authors.me;
									let message: string		= isFromMe ?
											Cyph.Strings.fileTransferInitMe :
											Cyph.Strings.fileTransferInitFriend
									;

									addMessageToChat(
										message + ' ' + fileName,
										Cyph.Session.Authors.app,
										!isFromMe
									);
									break;
								}
							}
							break;
						}
						case Cyph.P2P.UIEvents.Categories.request: {
							switch (e.event) {
								case Cyph.P2P.UIEvents.Events.acceptConfirm: {
									let callType: string	= e.args[0];
									let timeout: number		= e.args[1];
									let callback: Function	= e.args[2];

									confirmDialog({
										title: Cyph.Strings.videoCallingTitle,
										content:
											Cyph.Strings.webRTCRequest + ' ' +
											Strings[callType + 'Call'] + '. ' +
											Cyph.Strings.webRTCWarning
										,
										ok: Cyph.Strings.continueDialogAction,
										cancel: Cyph.Strings.decline
									}, callback, timeout);
									break;
								}
								case Cyph.P2P.UIEvents.Events.requestConfirm: {
									let callType: string	= e.args[0];
									let callback: Function	= e.args[1];

									confirmDialog({
										title: Cyph.Strings.videoCallingTitle,
										content:
											Cyph.Strings.webRTCInit + ' ' +
											Strings[callType + 'Call'] + '. ' +
											Cyph.Strings.webRTCWarning
										,
										ok: Cyph.Strings.continueDialogAction,
										cancel: Cyph.Strings.cancel
									}, callback);
									break;
								}
								case Cyph.P2P.UIEvents.Events.requestConfirmation: {
									alertDialog({
										title: Cyph.Strings.videoCallingTitle,
										content: Cyph.Strings.webRTCRequestConfirmation,
										ok: Cyph.Strings.ok
									});
									break;
								}
								case Cyph.P2P.UIEvents.Events.requestRejection: {
									alertDialog({
										title: Cyph.Strings.videoCallingTitle,
										content: Cyph.Strings.webRTCDeny,
										ok: Cyph.Strings.ok
									});
									break;
								}
							}
							break;
						}
						case Cyph.P2P.UIEvents.Categories.stream: {
							let author: Cyph.Session.Authors	= e.args[0];

							let $stream: JQuery	=
								author === Cyph.Session.Authors.me ?
									Cyph.UI.Elements.p2pMeStream :
									author === Cyph.Session.Authors.friend ?
										Cyph.UI.Elements.p2pFriendStream :
										Cyph.UI.Elements.p2pFriendPlaceholder
							;

							switch (e.event) {
								case Cyph.P2P.UIEvents.Events.play: {
									let shouldPlay: boolean	= e.args[1];

									$stream[0][shouldPlay ? 'play' : 'pause']();
									break;
								}
								case Cyph.P2P.UIEvents.Events.set: {
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
		};
	}
}
