/// <reference path="enums.ts" />
/// <reference path="p2pfile.ts" />
/// <reference path="session.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../util.ts" />
/// <reference path="../cyph.im/strings.ts" />
/// <reference path="../cyph.im/ui.elements.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />
/// <reference path="../../lib/typings/webrtc/MediaStream.d.ts" />
/// <reference path="../../lib/typings/webrtc/RTCPeerConnection.d.ts" />


module Session {
	export class P2P {
		private static getUserMedia	=
			navigator.getUserMedia ||
			navigator['mozGetUserMedia'] ||
			navigator['webkitGetUserMedia']
		;

		private static IceCandidate: any	=
			window.RTCIceCandidate ||
			window['mozRTCIceCandidate']
		;

		private static MediaStream: any	=
			window['MediaStream'] ||
			window['webkitMediaStream']
		;

		private static PeerConnection: any	=
			window.RTCPeerConnection ||
			window['mozRTCPeerConnection'] ||
			window['webkitRTCPeerConnection']
		;

		private static SessionDescription: any	=
			window.RTCSessionDescription ||
			window['mozRTCSessionDescription']
		;

		public static isSupported: boolean	= !!P2P.PeerConnection;

		public static events	= {
			fileTransferComplete: 'done'
		};


		private mutex: Mutex;
		private session: Session;

		private peer: RTCPeerConnection;
		private channel: any;

		private localStream: MediaStream;
		private remoteStream: MediaStream;

		private isAccepted: boolean;
		private isAvailable: boolean;
		private hasSessionStarted: boolean;
		private localStreamSetUpLock: boolean;

		private incomingFile: P2PFile	= new P2PFile;
		private outgoingFile: P2PFile	= new P2PFile;

		private streamOptions	= {audio: false, video: false, loading: false};
		private incomingStream	= {audio: false, video: false, loading: false};

		private commands	= {
			addIceCandidate: (candidate) => {
				if (this.isAvailable) {
					this.peer.addIceCandidate(new P2P.IceCandidate(JSON.parse(candidate)), () => {}, () => {});
				}
				else {
					setTimeout(() => {
						this.commands['addIceCandidate'](candidate);
					}, 500);
				}
			},

			decline: (answer) => {
				this.isAccepted	= false;

				this.triggerUiEvent(
					P2PUIEvents.Categories.request,
					P2PUIEvents.Events.requestRejection
				);
			},

			kill: () => {
				let wasAccepted			= this.isAccepted;
				this.isAccepted			= false;
				this.hasSessionStarted	= false;

				this.triggerUiEvent(
					P2PUIEvents.Categories.base,
					P2PUIEvents.Events.videoToggle,
					false
				);

				setTimeout(() => {
					delete this.streamOptions.video;
					delete this.streamOptions.audio;

					delete this.incomingStream.video;
					delete this.incomingStream.audio;

					if (this.localStream) {
						this.localStream['stop']();
						delete this.localStream;
					}

					if (this.remoteStream) {
						delete this.remoteStream;
					}

					if (this.peer) {
						try {
							this.peer.close();
						}
						catch (e) {}
					}

					this.mutex.lock(() => {
						setTimeout(this.mutex.unlock, 5000);
					});

					if (wasAccepted) {
						this.triggerUiEvent(
							P2PUIEvents.Categories.base,
							P2PUIEvents.Events.connected,
							false
						);
					}
				}, 500);
			},

			receiveAnswer: (answer) => {
				this.mutex.lock(() => {
					this.retry((retry) => {
						this.peer.setRemoteDescription(
							new P2P.SessionDescription(JSON.parse(answer)),
							() => {
								this.isAvailable			= true;
								this.localStreamSetUpLock	= false;
								this.mutex.unlock();
							},
							retry
						);
					});
				});
			},

			receiveOffer: (offer) => {
				this.setUpStream(null, offer);
			},

			streamOptions: (o) => {
				o	= JSON.parse(o);

				updateUI(() => {
					this.incomingStream.video	= o.video === true;
					this.incomingStream.audio	= o.audio === true;

					if (!this.incomingStream.video && !this.incomingStream.audio) {
						delete this.incomingStream.loading;
					}

					this.triggerUiEvent(
						P2PUIEvents.Categories.stream,
						P2PUIEvents.Events.play,
						Authors.app,
						(
							(this.streamOptions.video || this.incomingStream.audio) &&
							!this.incomingStream.video
						)
					);
				});
			}
		};

		private init () {
			if (this.peer) {
				return;
			}
			else if (!this.hasSessionStarted) {
				this.hasSessionStarted	= true;

				this.triggerUiEvent(
					P2PUIEvents.Categories.base,
					P2PUIEvents.Events.connected,
					true
				);
			}

			let dc;
			let pc	= new P2P.PeerConnection({
				iceServers: ['stun', 'turn'].map((s: string) => ({
					url: s + ':' + Config.p2pConfig.iceServer,
					credential: Config.p2pConfig.iceCredential,
					username: Config.p2pConfig.iceCredential
				}))
			}, {
				optional: [{DtlsSrtpKeyAgreement: true}]
			});

			pc.onaddstream	= (e) => {
				if (e.stream && (!this.remoteStream || this.remoteStream.id != e.stream.id)) {
					this.remoteStream	= e.stream;

					this.triggerUiEvent(
						P2PUIEvents.Categories.stream,
						P2PUIEvents.Events.set,
						Authors.friend,
						URL.createObjectURL(this.remoteStream)
					);

					setTimeout(() => {
						updateUI(() => {
							delete this.incomingStream.loading;
						});
					}, 1500);
				}
			};

			pc.ondatachannel	= (e) => {
				dc	= e.channel;
				this.channel	= dc;
				this.setUpChannel();
			};

			pc.onIceCandidate	= (e) => {
				if (e.candidate) {
					delete pc.onIceCandidate;
					this.session.send(new Message(Events.p2p, new Command(
						'addIceCandidate',
						JSON.stringify(e.candidate)
					)));
				}
			};

			pc.onsignalingstatechange	= (forceKill) => {
				forceKill	= forceKill === null;

				if (this.peer == pc && (forceKill || pc.signalingState == 'closed')) {
					this.isAvailable	= false;

					delete pc.onaddstream;
					delete this.remoteStream;
					delete this.channel;
					delete this.peer;

					if (forceKill) {
						dc && dc.close();
						pc.close();
					}

					if (this.hasSessionStarted) {
						this.init();
					}
				}
			};


			this.peer	= pc;
		}

		private kill () {
			this.session.send(new Message(Events.p2p, new Command('kill')));
			this.commands['kill']();
		}

		private receiveCommand (command, data) {
			if (!P2P.isSupported) {
				return;
			}

			if (this.isAccepted && typeof this.commands[command] == 'function') {
				this.commands[command](data);
			}
			else if (command == 'video' || command == 'voice' || command == 'file') {
				this.triggerUiEvent(
					P2PUIEvents.Categories.request,
					P2PUIEvents.Events.acceptConfirm,
					command,
					500000,
					(ok: boolean) => {
						if (ok) {
							this.isAccepted	= true;
							this.setUpStream({video: command == 'video', audio: command != 'file'});

							anal.send({
								hitType: 'event',
								eventCategory: 'call',
								eventAction: 'start',
								eventLabel: command,
								eventValue: 1
							});
						}
						else {
							this.session.send(new Message(Events.p2p, new Command('decline')));
						}
					}
				);
			}
		}

		private receiveIncomingFile (data, name) {
			this.triggerUiEvent(
				P2PUIEvents.Categories.file,
				P2PUIEvents.Events.confirm,
				name,
				(ok: boolean, title: string) => {
					if (ok) {
						Util.openUrl(URL.createObjectURL(new Blob(data)), name);
					}
					else {
						this.triggerUiEvent(
							P2PUIEvents.Categories.file,
							P2PUIEvents.Events.rejected,
							title
						);
					}
				}
			);
		}

		private requestCall (callType) {
			this.triggerUiEvent(
				P2PUIEvents.Categories.request,
				P2PUIEvents.Events.requestConfirm,
				callType,
				(ok) => {
					if (ok) {
						this.mutex.lock((wasFirst, wasFirstOfType) => {
							try {
								if (wasFirstOfType) {
									this.isAccepted				= true;
									this.streamOptions.video	= callType == 'video';
									this.streamOptions.audio	= callType != 'file';

									this.session.send(new Message(Events.p2p, new Command(callType)));

									setTimeout(() => {
										this.triggerUiEvent(
											P2PUIEvents.Categories.request,
											P2PUIEvents.Events.requestConfirmation
										);
									}, 250);

									/* Time out if request hasn't been accepted within 10 minutes */
									setTimeout(() => {
										if (!this.isAvailable) {
											this.isAccepted	= false;
										}
									}, 600000);
								}
							}
							finally {
								this.mutex.unlock();
							}
						}, 'requestCall');
					}
					else {
						this.triggerUiEvent(
							P2PUIEvents.Categories.file,
							P2PUIEvents.Events.clear
						);
					}
				}
			);
		}

		private retry (f) {
			Util.retryUntilComplete(f, () => { return this.isAccepted });
		}

		private sendFile () {
			if (this.outgoingFile.name || !this.channel || this.channel.readyState != 'open') {
				return;
			}

			this.triggerUiEvent(
				P2PUIEvents.Categories.file,
				P2PUIEvents.Events.get,
				(file: File) => {
					this.triggerUiEvent(
						P2PUIEvents.Categories.file,
						P2PUIEvents.Events.clear
					);


					if (file) {
						if (file.size > Config.p2pConfig.maxFileSize) {
							this.triggerUiEvent(
								P2PUIEvents.Categories.file,
								P2PUIEvents.Events.tooLarge
							);

							anal.send({
								hitType: 'event',
								eventCategory: 'file',
								eventAction: 'toolarge',
								eventValue: 1
							});

							return;
						}

						anal.send({
							hitType: 'event',
							eventCategory: 'file',
							eventAction: 'send',
							eventValue: 1
						});

						this.triggerUiEvent(
							P2PUIEvents.Categories.file,
							P2PUIEvents.Events.transferStarted,
							Authors.me,
							file.name
						);

						this.channel.send(P2P.events.fileTransferComplete);

						let reader	= new FileReader;

						reader.onloadend	= (e) => {
							let buf		= e.target['result'];
							let pos		= 0;

							updateUI(() => {
								this.outgoingFile.name			= file.name;
								this.outgoingFile.size			= buf.byteLength;
								this.outgoingFile.readableSize	= Util.readableByteLength(this.outgoingFile.size);
							});
							this.channel.send(this.outgoingFile.name + '\n' + this.outgoingFile.size);

							let timer: Timer	= new Timer(() => {
								if (!this.isAccepted) {
									timer.stop();
									return;
								}

								try {
									for (let i = 0 ; i < 10 ; ++i) {
										let old	= pos;
										pos += Config.p2pConfig.fileChunkSize;
										this.channel.send(buf.slice(old, pos));
									}
								}
								catch (e) {
									pos -= Config.p2pConfig.fileChunkSize;
								}

								if (buf.byteLength > pos) {
									updateUI(() => {
										this.outgoingFile.percentComplete	= pos / buf.byteLength * 100;
									});
								}
								else {
									timer.stop();

									this.channel.send(P2P.events.fileTransferComplete);

									updateUI(() => {
										delete this.outgoingFile.name;
										delete this.outgoingFile.size;
										delete this.outgoingFile.readableSize;
										delete this.outgoingFile.percentComplete;
									});
								}
							});
						};

						reader.readAsArrayBuffer(file);
					}
				}
			);
		}

		private setUpChannel (shouldCreate?) {
			if (!this.isAccepted) {
				return;
			}

			if (shouldCreate) {
				try {
					this.channel	= this.peer.createDataChannel('subspace', {});
				}
				catch (_) {
					setTimeout(() => { this.setUpChannel(true) }, 500);
					return;
				}
			}

			this.channel.onmessage	= (e) => {
				if (typeof e.data == 'string') {
					if (e.data == P2P.events.fileTransferComplete) {
						let data	= this.incomingFile.data;
						let name	= this.incomingFile.name;

						updateUI(() => {
							delete this.incomingFile.data;
							delete this.incomingFile.name;
							delete this.incomingFile.size;
							delete this.incomingFile.readableSize;
							delete this.incomingFile.percentComplete;
						});

						if (data) {
							this.receiveIncomingFile(data, name);
						}
					}
					else {
						let data	= e.data.split('\n');

						updateUI(() => {
							this.incomingFile.data			= [];
							this.incomingFile.name			= data[0];
							this.incomingFile.size			= parseInt(data[1], 10);
							this.incomingFile.readableSize	= Util.readableByteLength(this.incomingFile.size);
						});

						this.triggerUiEvent(
							P2PUIEvents.Categories.file,
							P2PUIEvents.Events.transferStarted,
							Authors.friend,
							this.incomingFile.name
						);
					}
				}
				else if (this.incomingFile.data) {
					this.incomingFile.data.push(e.data);

					updateUI(() => {
						this.incomingFile.percentComplete	=
							this.incomingFile.data.length *
								Config.p2pConfig.fileChunkSize /
								this.incomingFile.size *
								100
						;
					});
				}
			};

			this.channel.onopen	= this.sendFile;
		}

		private setUpStream (streamOptions?, offer?) {
			let retry	= () => {
				if (this.isAccepted) {
					setTimeout(() => {
						this.setUpStream(streamOptions);
					}, 100);
				}
			};

			if (!offer) {
				if (this.localStreamSetUpLock) {
					retry();
					return;
				}

				this.localStreamSetUpLock	= true;
			}

			this.incomingStream.loading	= true;

			if (streamOptions) {
				if (streamOptions.video === true || streamOptions.video === false) {
					this.streamOptions.video	= streamOptions.video;
				}
				if (streamOptions.audio === true || streamOptions.audio === false) {
					this.streamOptions.audio	= streamOptions.audio;
				}
			}

			this.mutex.lock((wasFirst, wasFirstOfType) => {
				if (wasFirstOfType && this.isAccepted) {
					this.init();

					let streamHelper, streamFallback, streamSetup;

					streamHelper	= (stream) => {
						if (!this.isAccepted) {
							return;
						}

						if (this.localStream) {
							this.localStream['stop']();
							delete this.localStream;
						}

						if (stream) {
							if (this.peer.getLocalStreams().length > 0) {
								this.peer.onsignalingstatechange(null);
							}

							this.localStream	= stream;
							this.peer.addStream(this.localStream);
						}

						this.triggerUiEvent(
							P2PUIEvents.Categories.stream,
							P2PUIEvents.Events.set,
							Authors.me,
							stream ? URL.createObjectURL(this.localStream) : ''
						);


						[
							{k: 'audio', f: 'getAudioTracks'},
							{k: 'video', f: 'getVideoTracks'}
						].forEach((o) => {
							this.streamOptions[o.k]	= !!this.localStream && this.localStream[o.f]().
								map((track) => { return track.enabled }).
								reduce((a, b) => { return a || b }, false)
							;
						});


						let outgoingStream	= JSON.stringify(this.streamOptions);

						if (!offer) {
							this.setUpChannel(true);

							this.retry((retry) => {
								this.peer.createOffer((offer) => {
									/* http://www.kapejod.org/en/2014/05/28/ */
									offer.sdp	= offer.sdp.
										split('\n').
										filter((line) => {
											return line.indexOf('urn:ietf:params:rtp-hdrext:ssrc-audio-level') < 0 &&
												line.indexOf('b=AS:') < 0
											;
										}).
										join('\n')
									;

									this.retry((retry) => {
										this.peer.setLocalDescription(offer, () => {
											this.session.send(
												new Message(
													Events.p2p,
													new Command(
														'receiveOffer',
														JSON.stringify(offer)
													)
												),
												new Message(
													Events.p2p,
													new Command(
														'streamOptions',
														outgoingStream
													)
												)
											);

											this.mutex.unlock();
										}, retry);
									});
								}, retry, {
									offerToReceiveAudio: true,
									offerToReceiveVideo: true
								});
							});
						}
						else {
							this.retry((retry) => {
								this.peer.setRemoteDescription(
									new P2P.SessionDescription(JSON.parse(offer)),
									() => {
										this.retry((retry) => {
											this.peer.createAnswer((answer) => {
												this.retry((retry) => {
													this.peer.setLocalDescription(answer, () => {
														this.session.send(
															new Message(
																Events.p2p,
																new Command(
																	'receiveAnswer',
																	JSON.stringify(answer)
																)
															),
															new Message(
																Events.p2p,
																new Command(
																	'streamOptions',
																	outgoingStream
																)
															)
														);

														this.isAvailable	= true;

														this.mutex.unlock();
													}, retry);
												});
											}, retry);
										});
									},
									retry
								);
							});
						}

						this.triggerUiEvent(
							P2PUIEvents.Categories.base,
							P2PUIEvents.Events.videoToggle,
							true
						);
					};

					streamFallback	= () => {
						if (this.streamOptions.video) {
							this.streamOptions.video	= false;
						}
						else if (this.streamOptions.audio) {
							this.streamOptions.audio	= false;
						}

						streamSetup();
					};

					streamSetup	= () => {
						if (this.streamOptions.video || this.streamOptions.audio) {
							P2P.getUserMedia(this.streamOptions, streamHelper, streamFallback);
						}
						else if (this.incomingStream.video || this.incomingStream.audio) {
							try {
								streamHelper(new P2P.MediaStream);
							}
							catch (_) {
								P2P.getUserMedia({audio: true, video: false}, (stream) => {
									stream.getTracks().forEach((track) => {
										track.enabled	= false;
									});

									streamHelper(stream);
								}, streamFallback);
							}
						}
						else {
							streamHelper();
						}
					};

					streamSetup();
				}
				else {
					if (offer) {
						this.mutex.unlock();
					}
					else {
						this.localStreamSetUpLock	= false;
						retry();
					}
				}
			}, 'setUpStream' + (offer ? '' : 'Init'));
		}

		private triggerUiEvent(
			category: P2PUIEvents.Categories,
			event: P2PUIEvents.Events,
			...args: any[]
		) {
			this.session.trigger(Events.p2pUi, {category, event, args});
		}

		public constructor (session: Session) {
			this.session	= session;
			this.mutex		= new Mutex(this.session);

			this.session.on(Events.closeChat, this.kill);
			this.session.on(Events.p2p, (command: Command) => {
				if (command.method) {
					this.commands[command.method](command.argument);
				}
				else if (P2P.isSupported) {
					this.triggerUiEvent(P2PUIEvents.Categories.base, P2PUIEvents.Events.enable);
				}
			});


			/* Temporarily leaving UI events here */

			this.session.on(
				Events.p2pUi,
				(e: {
					category: P2PUIEvents.Categories;
					event: P2PUIEvents.Events;
					args: any[];
				}) => {
					switch (e.category) {
						case P2PUIEvents.Categories.base:
							switch (e.event) {
								case P2PUIEvents.Events.connected:
									var isConnected: boolean	= e.args[0];

									if (isConnected) {
										addMessageToChat(
											Cyph.im.Strings.webRTCConnect,
											Authors.app,
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
											Authors.app,
											false
										);
									}
									break;

								case P2PUIEvents.Events.enable:
									enableWebRTC();
									break;

								case P2PUIEvents.Events.videoToggle:
									var isVideoCall: boolean	= e.args[0];

									toggleVideoCall(isVideoCall);
									break;
							}
							break;

						case P2PUIEvents.Categories.file:
							switch (e.event) {
								case P2PUIEvents.Events.clear:
									Cyph.im.UI.Elements.p2pFiles.each((i, elem) =>
										$(elem).val('')
									);
									break;

								case P2PUIEvents.Events.confirm:
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

								case P2PUIEvents.Events.get:
									var callback: Function	= e.args[0];

									var file: File	= Cyph.im.UI.Elements.p2pFiles.
										toArray().
										map(($elem) => $elem['files']).
										reduce((a, b) => { return (a && a[0]) ? a : b }, [])[0]
									;

									callback(file);
									break;

								case P2PUIEvents.Events.rejected:
									var title: string	= e.args[0];

									alertDialog({
										title: title,
										content: Cyph.im.Strings.incomingFileReject,
										ok: Cyph.im.Strings.ok
									});
									break;

								case P2PUIEvents.Events.tooLarge:
									alertDialog({
										title: Cyph.im.Strings.oopsTitle,
										content: Cyph.im.Strings.fileTooLarge,
										ok: Cyph.im.Strings.ok
									});
									break;

								case P2PUIEvents.Events.transferStarted:
									var author: Authors		= e.args[0];
									var fileName: string	= e.args[1];

									var isFromMe: boolean	= author == Authors.me;
									var message: string		= isFromMe ?
											Cyph.im.Strings.fileTransferInitMe :
											Cyph.im.Strings.fileTransferInitFriend
									;

									addMessageToChat(message + ' ' + fileName, Authors.app, !isFromMe);
									break;
							}
							break;

						case P2PUIEvents.Categories.request:
							switch (e.event) {
								case P2PUIEvents.Events.acceptConfirm:
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

								case P2PUIEvents.Events.requestConfirm:
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

								case P2PUIEvents.Events.requestConfirmation:
									alertDialog({
										title: Cyph.im.Strings.videoCallingTitle,
										content: Cyph.im.Strings.webRTCRequestConfirmation,
										ok: Cyph.im.Strings.ok
									});
									break;

								case P2PUIEvents.Events.requestRejection:
									alertDialog({
										title: Cyph.im.Strings.videoCallingTitle,
										content: Cyph.im.Strings.webRTCDeny,
										ok: Cyph.im.Strings.ok
									});
									break;
							}
							break;

						case P2PUIEvents.Categories.stream:
							var author: Authors	= e.args[0];

							var $stream: JQuery	=
								author == Authors.me ?
									Cyph.im.UI.Elements.p2pMeStream :
									author == Authors.friend ?
										Cyph.im.UI.Elements.p2pFriendStream :
										Cyph.im.UI.Elements.p2pFriendPlaceholder
							;

							switch (e.event) {
								case P2PUIEvents.Events.play:
									var shouldPlay: boolean	= e.args[1];

									$stream[0][shouldPlay ? 'play' : 'pause']();
									break;

								case P2PUIEvents.Events.set:
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
		}
	}
}
