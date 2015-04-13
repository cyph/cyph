/// <reference path="strings.ts" />
/// <reference path="ui.ts" />
/// <reference path="ui.elements.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../session/enums.ts" />
/// <reference path="../session/isession.ts" />
/// <reference path="../session/p2p.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


module Cyph.im {
	export module UI {
		export let events	= (session: Session.ISession) : void => {
			/* Main session events */

			session.on(Session.Events.beginChat, () =>
				beginChatUi(() =>
					UI.Elements.window.
						unload(() => session.close()).
						on('beforeunload', () =>
							Cyph.im.Strings.disconnectWarning
						)
				)
			);

			session.on(Session.Events.beginWaiting, beginWaiting);

			session.on(Session.Events.closeChat, closeChat);

			session.on(Session.Events.cyphertext,
				(o: { cyphertext: string; author: Session.Authors; }) =>
					logCyphertext(o.cyphertext, o.author)
			);

			session.on(Session.Events.newCyph, () => changeState(states.spinningUp));

			session.on(Session.Events.smp, (wasSuccessful: boolean) => {
				if (wasSuccessful) {
					markAllAsSent();
				}
				else {
					abortSetup();
				}
			});

			session.on(Session.Events.text,
				(o: { text: string; author: Session.Authors; }) =>
					addMessageToChat(o.text, o.author, o.author !== Session.Authors.me)
			);

			session.on(Session.Events.typing, friendIsTyping);


			/* P2P events */

			session.on(
				Session.Events.p2pUi,
				(e: {
					category: Session.P2PUIEvents.Categories;
					event: Session.P2PUIEvents.Events;
					args: any[];
				}) => {
					switch (e.category) {
						case Session.P2PUIEvents.Categories.base:
							switch (e.event) {
								case Session.P2PUIEvents.Events.connected:
									var isConnected: boolean	= e.args[0];

									if (isConnected) {
										addMessageToChat(
											Cyph.im.Strings.webRTCConnect,
											Session.Authors.app,
											false
										);
									}
									else {
										alertDialog({
											title: Cyph.im.Strings.videoCallingTitle,
											content: Cyph.im.Strings.webRTCDisconnect,
											ok: Cyph.im.Strings.ok
										});

										addMessageToChat(
											Cyph.im.Strings.webRTCDisconnect,
											Session.Authors.app,
											false
										);
									}
									break;

								case Session.P2PUIEvents.Events.enable:
									enableWebRTC();
									break;

								case Session.P2PUIEvents.Events.videoToggle:
									var isVideoCall: boolean	= e.args[0];

									toggleVideoCall(isVideoCall);
									break;
							}
							break;

						case Session.P2PUIEvents.Categories.file:
							switch (e.event) {
								case Session.P2PUIEvents.Events.clear:
									Cyph.im.UI.Elements.p2pFiles.each((i, elem) =>
										$(elem).val('')
									);
									break;

								case Session.P2PUIEvents.Events.confirm:
									var name: string		= e.args[0];
									var callback: Function	= e.args[1];

									var title	= Cyph.im.Strings.incomingFile + ' ' + name;

									confirmDialog({
										title: title,
										content: Cyph.im.Strings.incomingFileWarning,
										ok: Cyph.im.Strings.save,
										cancel: Cyph.im.Strings.reject
									}, (ok: boolean) => callback(ok, title));
									break;

								case Session.P2PUIEvents.Events.get:
									var callback: Function	= e.args[0];

									var file: File	= Cyph.im.UI.Elements.p2pFiles.
										toArray().
										map(($elem) => $elem['files']).
										reduce((a, b) => (a && a[0]) ? a : b, [])[0]
									;

									callback(file);
									break;

								case Session.P2PUIEvents.Events.rejected:
									var title: string	= e.args[0];

									alertDialog({
										title: title,
										content: Cyph.im.Strings.incomingFileReject,
										ok: Cyph.im.Strings.ok
									});
									break;

								case Session.P2PUIEvents.Events.tooLarge:
									alertDialog({
										title: Cyph.im.Strings.oopsTitle,
										content: Cyph.im.Strings.fileTooLarge,
										ok: Cyph.im.Strings.ok
									});
									break;

								case Session.P2PUIEvents.Events.transferStarted:
									var author: Session.Authors	= e.args[0];
									var fileName: string		= e.args[1];

									var isFromMe: boolean	= author === Session.Authors.me;
									var message: string		= isFromMe ?
											Cyph.im.Strings.fileTransferInitMe :
											Cyph.im.Strings.fileTransferInitFriend
									;

									addMessageToChat(
										message + ' ' + fileName,
										Session.Authors.app,
										!isFromMe
									);
									break;
							}
							break;

						case Session.P2PUIEvents.Categories.request:
							switch (e.event) {
								case Session.P2PUIEvents.Events.acceptConfirm:
									var callType: string	= e.args[0];
									var timeout: number		= e.args[1];
									var callback: Function	= e.args[2];

									confirmDialog({
										title: Cyph.im.Strings.videoCallingTitle,
										content:
											Cyph.im.Strings.webRTCRequest + ' ' +
											Cyph.im.Strings[callType + 'Call'] + '. ' +
											Cyph.im.Strings.webRTCWarning
										,
										ok: Cyph.im.Strings.continueDialogAction,
										cancel: Cyph.im.Strings.decline
									}, callback, timeout);
									break;

								case Session.P2PUIEvents.Events.requestConfirm:
									var callType: string	= e.args[0];
									var callback: Function	= e.args[1];

									confirmDialog({
										title: Cyph.im.Strings.videoCallingTitle,
										content:
											Cyph.im.Strings.webRTCInit + ' ' +
											Cyph.im.Strings[callType + 'Call'] + '. ' +
											Cyph.im.Strings.webRTCWarning
										,
										ok: Cyph.im.Strings.continueDialogAction,
										cancel: Cyph.im.Strings.cancel
									}, callback);
									break;

								case Session.P2PUIEvents.Events.requestConfirmation:
									alertDialog({
										title: Cyph.im.Strings.videoCallingTitle,
										content: Cyph.im.Strings.webRTCRequestConfirmation,
										ok: Cyph.im.Strings.ok
									});
									break;

								case Session.P2PUIEvents.Events.requestRejection:
									alertDialog({
										title: Cyph.im.Strings.videoCallingTitle,
										content: Cyph.im.Strings.webRTCDeny,
										ok: Cyph.im.Strings.ok
									});
									break;
							}
							break;

						case Session.P2PUIEvents.Categories.stream:
							var author: Session.Authors	= e.args[0];

							var $stream: JQuery	=
								author === Session.Authors.me ?
									Cyph.im.UI.Elements.p2pMeStream :
									author === Session.Authors.friend ?
										Cyph.im.UI.Elements.p2pFriendStream :
										Cyph.im.UI.Elements.p2pFriendPlaceholder
							;

							switch (e.event) {
								case Session.P2PUIEvents.Events.play:
									var shouldPlay: boolean	= e.args[1];

									$stream[0][shouldPlay ? 'play' : 'pause']();
									break;

								case Session.P2PUIEvents.Events.set:
									var url: string	= e.args[1];

									try {
										URL.revokeObjectURL($stream.attr('src'));
									}
									catch (_) {}

									$stream.attr('src', url);
									break;
							}
							break;
					}
				}
			);
		};
	}
}
