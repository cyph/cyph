/// <reference path="command.ts" />
/// <reference path="enums.ts" />
/// <reference path="imutex.ts" />
/// <reference path="ip2p.ts" />
/// <reference path="isession.ts" />
/// <reference path="message.ts" />
/// <reference path="mutex.ts" />
/// <reference path="p2pfile.ts" />
/// <reference path="../analytics.ts" />
/// <reference path="../icontroller.ts" />
/// <reference path="../timer.ts" />
/// <reference path="../util.ts" />
/// <reference path="../webrtc.ts" />
/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/webrtc/MediaStream.d.ts" />
/// <reference path="../../../lib/typings/webrtc/RTCPeerConnection.d.ts" />


module Cyph {
	export module Session {
		export class P2P implements IP2P {
			private static constants	= {
				addIceCandidate: 'addIceCandidate',
				audio: 'audio',
				closed: 'closed',
				decline: 'decline',
				file: 'file',
				fileTransferComplete: 'fileTransferComplete',
				kill: 'kill',
				open: 'open',
				receiveAnswer: 'receiveAnswer',
				receiveOffer: 'receiveOffer',
				requestCall: 'requestCall',
				setUpStream: 'setUpStream',
				setUpStreamInit: 'setUpStreamInit',
				streamOptions: 'streamOptions',
				stun: 'stun',
				subspace: 'subspace',
				turn: 'turn',
				video: 'video',
				voice: 'voice'
			};


			private controller: IController;
			private mutex: IMutex;
			private session: ISession;
			private channel: RTCDataChannel;
			private peer: RTCPeerConnection;
			private localStream: MediaStream;
			private remoteStream: MediaStream;
			private isAccepted: boolean;
			private isAvailable: boolean;
			private hasSessionStarted: boolean;
			private localStreamSetUpLock: boolean;

			private incomingFile: P2PFile	= new P2PFile;
			private outgoingFile: P2PFile	= new P2PFile;

			private commands	= {
				addIceCandidate: (candidate: string) : void => {
					if (this.isAvailable) {
						this.peer.addIceCandidate(
							new WebRTC.IceCandidate(JSON.parse(candidate)),
							() => {},
							() => {}
						);
					}
					else {
						setTimeout(() =>
							this.commands.addIceCandidate(candidate)
						, 500);
					}
				},

				decline: () : void => {
					this.isAccepted	= false;

					this.triggerUiEvent(
						P2PUIEvents.Categories.request,
						P2PUIEvents.Events.requestRejection
					);
				},

				kill: () : void => {
					let wasAccepted: boolean	= this.isAccepted;
					this.isAccepted				= false;
					this.hasSessionStarted		= false;

					this.triggerUiEvent(
						P2PUIEvents.Categories.base,
						P2PUIEvents.Events.videoToggle,
						false
					);

					setTimeout(() => {
						[this.streamOptions, this.incomingStream].forEach(o =>
							Object.keys(o).forEach(k =>
								o[k]	= false
							)
						);

						try {
							this.localStream['stop']();
						}
						catch (_) {}
						try {
							this.peer.close();
						}
						catch (_) {}

						this.localStream	= null;
						this.remoteStream	= null;

						this.mutex.lock(() =>
							setTimeout(this.mutex.unlock, 5000)
						);

						if (wasAccepted) {
							this.triggerUiEvent(
								P2PUIEvents.Categories.base,
								P2PUIEvents.Events.connected,
								false
							);
						}
					}, 500);
				},

				receiveAnswer: (answer: string) : void => {
					this.mutex.lock(() => {
						this.retryUntilSuccessful(retry => {
							this.peer.setRemoteDescription(
								new WebRTC.SessionDescription(JSON.parse(answer)),
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

				receiveOffer: (offer: string) : void => {
					this.setUpStream(null, offer);
				},

				streamOptions: (options: string) : void => {
					let o: any	= JSON.parse(options);

					this.incomingStream.video	= o.video === true;
					this.incomingStream.audio	= o.audio === true;

					if (!this.incomingStream.video && !this.incomingStream.audio) {
						this.incomingStream.loading	= false;
					}

					this.controller.update();

					this.triggerUiEvent(
						P2PUIEvents.Categories.stream,
						P2PUIEvents.Events.play,
						Authors.app,
						(
							(
								this.streamOptions.video ||
								this.incomingStream.audio
							) &&
							!this.incomingStream.video
						)
					);
				}
			};

			public incomingStream	= {audio: false, video: false, loading: false};
			public streamOptions	= {audio: false, video: false, loading: false};

			private initPeer () : void {
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

				let dc: RTCDataChannel;
				let pc: RTCPeerConnection	= new WebRTC.PeerConnection({
					iceServers: [
						P2P.constants.stun,
						P2P.constants.turn
					].map((protocol: string) => ({
						url: protocol + ':' + Config.p2pConfig.iceServer,
						credential: Config.p2pConfig.iceCredential,
						username: Config.p2pConfig.iceCredential
					}))
				}, {
					optional: [{DtlsSrtpKeyAgreement: true}]
				});

				pc.onaddstream	= e => {
					if (
						e.stream &&
						(
							!this.remoteStream ||
							this.remoteStream.id !== e.stream.id
						)
					) {
						this.remoteStream	= e.stream;

						this.triggerUiEvent(
							P2PUIEvents.Categories.stream,
							P2PUIEvents.Events.set,
							Authors.friend,
							URL.createObjectURL(this.remoteStream)
						);

						setTimeout(() => {
							this.incomingStream.loading	= false;
							this.controller.update();
						}, 1500);
					}
				};

				pc.ondatachannel	= e => {
					dc				= e['channel'];
					this.channel	= dc;

					this.setUpChannel();
				};

				pc['onIceCandidate']	= e => {
					if (e.candidate) {
						delete pc['onIceCandidate'];

						this.session.send(
							new Message(
								Events.p2p,
								new Command(
									P2P.constants.addIceCandidate,
									JSON.stringify(e.candidate)
								)
							)
						);
					}
				};

				pc.onsignalingstatechange	= e => {
					let forceKill: boolean	= e === null;

					if (
						this.peer === pc &&
						(
							forceKill ||
							pc.signalingState === P2P.constants.closed
						)
					) {
						delete pc.onaddstream;

						this.isAvailable	= false;
						this.remoteStream	= null;
						this.channel		= null;
						this.peer			= null;

						if (forceKill) {
							dc && dc.close();
							pc.close();
						}

						if (this.hasSessionStarted) {
							this.initPeer();
						}
					}
				};


				this.peer	= pc;
			}

			private kill () : void {
				this.session.send(
					new Message(
						Events.p2p,
						new Command(P2P.constants.kill)
					)
				);

				this.commands.kill();
			}

			private receiveCommand (command: string, data?: any) : void {
				if (!WebRTC.isSupported) {
					return;
				}

				if (this.isAccepted && typeof this.commands[command] === 'function') {
					this.commands[command](data);
				}
				else if (
					command === P2P.constants.video ||
					command === P2P.constants.voice ||
					command === P2P.constants.file
				) {
					this.triggerUiEvent(
						P2PUIEvents.Categories.request,
						P2PUIEvents.Events.acceptConfirm,
						command,
						500000,
						(ok: boolean) => {
							if (ok) {
								this.isAccepted	= true;
								this.setUpStream({
									video: command === P2P.constants.video,
									audio: command !== P2P.constants.file
								});

								Analytics.main.send({
									hitType: 'event',
									eventCategory: 'call',
									eventAction: 'start',
									eventLabel: command,
									eventValue: 1
								});
							}
							else {
								this.session.send(
									new Message(
										Events.p2p,
										new Command(P2P.constants.decline)
									)
								);
							}
						}
					);
				}
			}

			private receiveIncomingFile (data: ArrayBuffer[], name: string) : void {
				this.triggerUiEvent(
					P2PUIEvents.Categories.file,
					P2PUIEvents.Events.confirm,
					name,
					(ok: boolean, title: string) => {
						if (ok) {
							Util.openUrl(
								URL.createObjectURL(new Blob(data)),
								name
							);
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

			private requestCall (callType: string) : void {
				this.triggerUiEvent(
					P2PUIEvents.Categories.request,
					P2PUIEvents.Events.requestConfirm,
					callType,
					(ok: boolean) => {
						if (ok) {
							this.mutex.lock((wasFirst: boolean, wasFirstOfType: boolean) => {
								try {
									if (wasFirstOfType) {
										this.isAccepted				= true;
										this.streamOptions.video	= callType === P2P.constants.video;
										this.streamOptions.audio	= callType !== P2P.constants.file;

										this.session.send(
											new Message(
												Events.p2p,
												new Command(callType)
											)
										);

										setTimeout(() =>
											this.triggerUiEvent(
												P2PUIEvents.Categories.request,
												P2PUIEvents.Events.requestConfirmation
											)
										, 250);

										/* Time out if request hasn't been
											accepted within 10 minutes */
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
							}, P2P.constants.requestCall);
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

			private retryUntilSuccessful (f: Function) : void {
				Util.retryUntilComplete(f, () => this.isAccepted);
			}

			private sendFile () : void {
				if (
					this.outgoingFile.name ||
					!this.channel ||
					this.channel.readyState !== P2P.constants.open
				) {
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

								Analytics.main.send({
									hitType: 'event',
									eventCategory: 'file',
									eventAction: 'toolarge',
									eventValue: 1
								});

								return;
							}

							Analytics.main.send({
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

							this.channel.send(P2P.constants.fileTransferComplete);

							let reader: FileReader	= new FileReader;

							reader.onloadend	= e => {
								let buf: ArrayBuffer	= e.target['result'];
								let pos: number			= 0;

								this.outgoingFile.name	= file.name;
								this.outgoingFile.size	= buf.byteLength;

								this.outgoingFile.readableSize	=
									Util.readableByteLength(
										this.outgoingFile.size
									)
								;

								this.controller.update();

								this.channel.send(
									this.outgoingFile.name +
									'\n' +
									this.outgoingFile.size
								);

								let timer: Timer	= new Timer(() => {
									if (!this.isAccepted) {
										timer.stop();
										return;
									}

									try {
										for (let i = 0 ; i < 10 ; ++i) {
											let old: number	= pos;
											pos += Config.p2pConfig.fileChunkSize;
											this.channel.send(buf.slice(old, pos));
										}
									}
									catch (_) {
										pos -= Config.p2pConfig.fileChunkSize;
									}

									if (buf.byteLength > pos) {
										this.outgoingFile.percentComplete	=
											pos / buf.byteLength * 100
										;

										this.controller.update();
									}
									else {
										timer.stop();

										this.channel.send(P2P.constants.fileTransferComplete);

										this.outgoingFile.name				= '';
										this.outgoingFile.size				= 0;
										this.outgoingFile.readableSize		= '';
										this.outgoingFile.percentComplete	= 0;

										this.controller.update();
									}
								});
							};

							reader.readAsArrayBuffer(file);
						}
					}
				);
			}

			private setUpChannel (shouldCreate?: boolean) : void {
				if (!this.isAccepted) {
					return;
				}

				if (shouldCreate) {
					try {
						this.channel	= this.peer.createDataChannel(
							P2P.constants.subspace,
							{}
						);
					}
					catch (_) {
						setTimeout(() => this.setUpChannel(true), 500);
						return;
					}
				}

				this.channel.onmessage	= e => {
					if (typeof e.data === 'string') {
						if (e.data === P2P.constants.fileTransferComplete) {
							let data: ArrayBuffer[]	= this.incomingFile.data;
							let name: string		= this.incomingFile.name;

							this.incomingFile.data				= null;
							this.incomingFile.name				= '';
							this.incomingFile.size				= 0;
							this.incomingFile.readableSize		= '';
							this.incomingFile.percentComplete	= 0;

							this.controller.update();

							if (data) {
								this.receiveIncomingFile(data, name);
							}
						}
						else {
							let data: string[]	= e.data.split('\n');

							this.incomingFile.data	= [];
							this.incomingFile.name	= data[0];
							this.incomingFile.size	= parseInt(data[1], 10);

							this.incomingFile.readableSize	=
								Util.readableByteLength(
									this.incomingFile.size
								)
							;

							this.controller.update();

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

						this.incomingFile.percentComplete	=
							this.incomingFile.data.length *
								Config.p2pConfig.fileChunkSize /
								this.incomingFile.size *
								100
						;

						this.controller.update();
					}
				};

				this.channel.onopen	= this.sendFile;
			}

			private setUpStream (streamOptions?: any, offer?: string) : void {
				this.retryUntilSuccessful(retry => {
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

					this.mutex.lock((wasFirst: boolean, wasFirstOfType: boolean) => {
						if (wasFirstOfType && this.isAccepted) {
							this.initPeer();

							let streamHelper;
							let streamFallback;
							let streamSetup;

							streamHelper	= (stream: MediaStream) => {
								if (!this.isAccepted) {
									return;
								}

								if (this.localStream) {
									this.localStream['stop']();
									this.localStream	= null;
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
									{k: P2P.constants.audio, f: 'getAudioTracks'},
									{k: P2P.constants.video, f: 'getVideoTracks'}
								].forEach(o =>
									this.streamOptions[o.k]	=
										!!this.localStream &&
										this.localStream[o.f]().
											map(track => track.enabled).
											reduce((a, b) => a || b, false)
								);


								let outgoingStream: string	=
									JSON.stringify(this.streamOptions)
								;

								if (!offer) {
									this.setUpChannel(true);

									this.retryUntilSuccessful(retry =>
										this.peer.createOffer(offer => {
											/* http://www.kapejod.org/en/2014/05/28/ */
											offer.sdp	= offer.sdp.
												split('\n').
												filter((line) =>
													line.indexOf('b=AS:') < 0 &&
													line.indexOf(
														'urn:ietf:params:rtp-hdrext:ssrc-audio-level'
													) < 0
												).
												join('\n')
											;

											this.retryUntilSuccessful(retry =>
												this.peer.setLocalDescription(offer, () => {
													this.session.send(
														new Message(
															Events.p2p,
															new Command(
																P2P.constants.receiveOffer,
																JSON.stringify(offer)
															)
														),
														new Message(
															Events.p2p,
															new Command(
																P2P.constants.streamOptions,
																outgoingStream
															)
														)
													);

													this.mutex.unlock();
												}, retry)
											);
										}, retry, {
											offerToReceiveAudio: true,
											offerToReceiveVideo: true
										})
									);
								}
								else {
									this.retryUntilSuccessful(retry =>
										this.peer.setRemoteDescription(
											new WebRTC.SessionDescription(JSON.parse(offer)),
											() =>
												this.retryUntilSuccessful(retry =>
													this.peer.createAnswer(answer =>
														this.retryUntilSuccessful(retry =>
															this.peer.setLocalDescription(answer, () => {
																this.session.send(
																	new Message(
																		Events.p2p,
																		new Command(
																			P2P.constants.receiveAnswer,
																			JSON.stringify(answer)
																		)
																	),
																	new Message(
																		Events.p2p,
																		new Command(
																			P2P.constants.streamOptions,
																			outgoingStream
																		)
																	)
																);

																this.isAvailable	= true;

																this.mutex.unlock();
															}, retry)
														)
													, retry)
												)
											,
											retry
										)
									);
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
									WebRTC.getUserMedia(
										this.streamOptions,
										streamHelper,
										streamFallback
									);
								}
								else if (this.incomingStream.video || this.incomingStream.audio) {
									try {
										streamHelper(new WebRTC.MediaStream);
									}
									catch (_) {
										WebRTC.getUserMedia(
											{audio: true, video: false},
											stream => {
												stream.getTracks().forEach(track =>
													track.enabled	= false
												);

												streamHelper(stream);
											},
											streamFallback
										);
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
					}, offer ? P2P.constants.setUpStream : P2P.constants.setUpStreamInit);
				});
			}

			private triggerUiEvent(
				category: P2PUIEvents.Categories,
				event: P2PUIEvents.Events,
				...args: any[]
			) : void {
				this.session.trigger(Events.p2pUi, {category, event, args});
			}

			public constructor (controller: IController) {
				this.controller	= controller;
			}

			public init (session: ISession) : void {
				if (!this.session) {
					this.session	= session;
					this.mutex		= new Mutex(this.session);

					this.session.on(Events.beginChat, () =>
						this.session.send(new Message(Events.p2p, new Command))
					);

					this.session.on(Events.closeChat, this.kill);

					this.session.on(Events.p2p, (command: Command) => {
						if (command.method) {
							this.commands[command.method](command.argument);
						}
						else if (WebRTC.isSupported) {
							this.triggerUiEvent(
								P2PUIEvents.Categories.base,
								P2PUIEvents.Events.enable
							);
						}
					});
				}
			}
		}
	}
}
