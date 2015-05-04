/// <reference path="ip2p.ts" />
/// <reference path="filetransfer.ts" />
/// <reference path="../session/command.ts" />
/// <reference path="../session/mutex.ts" />


module Cyph {
	export module P2P {
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


			private mutex: Session.IMutex;
			private channel: RTCDataChannel;
			private peer: RTCPeerConnection;
			private localStream: MediaStream;
			private remoteStream: MediaStream;
			private isAccepted: boolean;
			private isAvailable: boolean;
			private hasSessionStarted: boolean;
			private localStreamSetUpLock: boolean;

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
						UIEvents.Categories.request,
						UIEvents.Events.requestRejection
					);
				},

				kill: () : void => {
					let wasAccepted: boolean	= this.isAccepted;
					this.isAccepted				= false;
					this.hasSessionStarted		= false;

					this.triggerUiEvent(
						UIEvents.Categories.base,
						UIEvents.Events.videoToggle,
						false
					);

					setTimeout(() => {
						for (let o of [this.outgoingStream, this.incomingStream]) {
							for (let k of Object.keys(o)) {
								o[k]	= false;
							}
						}

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
							setTimeout(() => this.mutex.unlock(), 5000)
						);

						if (wasAccepted) {
							this.triggerUiEvent(
								UIEvents.Categories.base,
								UIEvents.Events.connected,
								false
							);
						}
					}, 500);
				},

				receiveAnswer: (answer: string) : void => {
					this.mutex.lock(() => {
						this.retryUntilComplete(retry => {
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
						UIEvents.Categories.stream,
						UIEvents.Events.play,
						Session.Authors.app,
						(
							(
								this.outgoingStream.video ||
								this.incomingStream.audio
							) &&
							!this.incomingStream.video
						)
					);
				}
			};

			public incomingStream				= {audio: false, video: false, loading: false};
			public outgoingStream				= {audio: false, video: false, loading: false};
			public incomingFile: IFileTransfer	= new FileTransfer;
			public outgoingFile: IFileTransfer	= new FileTransfer;

			private initPeer () : void {
				if (this.peer) {
					return;
				}
				else if (!this.hasSessionStarted) {
					this.hasSessionStarted	= true;

					this.triggerUiEvent(
						UIEvents.Categories.base,
						UIEvents.Events.connected,
						true
					);
				}

				let channel: RTCDataChannel;
				let peer: RTCPeerConnection	= new WebRTC.PeerConnection({
					iceServers: [
						{url: P2P.constants.stun + ':' + Config.p2pConfig.iceServer},
						{
							url: P2P.constants.turn + ':' + Config.p2pConfig.iceServer,
							credential: Config.p2pConfig.iceCredential,
							username: Config.p2pConfig.iceCredential
						}
					]
				}, {
					optional: [{DtlsSrtpKeyAgreement: true}]
				});

				peer.onaddstream	= e => {
					if (
						e.stream &&
						(
							!this.remoteStream ||
							this.remoteStream.id !== e.stream.id
						)
					) {
						this.remoteStream	= e.stream;

						this.triggerUiEvent(
							UIEvents.Categories.stream,
							UIEvents.Events.set,
							Session.Authors.friend,
							URL.createObjectURL(this.remoteStream)
						);

						setTimeout(() => {
							this.incomingStream.loading	= false;
							this.controller.update();
						}, 1500);
					}
				};

				peer.ondatachannel	= e => {
					channel			= e['channel'];
					this.channel	= channel;

					this.setUpChannel();
				};

				peer.onicecandidate	= e => {
					if (e.candidate) {
						peer.onicecandidate	= null;

						this.session.send(
							new Session.Message(
								Session.RPCEvents.p2p,
								new Session.Command(
									P2P.constants.addIceCandidate,
									JSON.stringify(e.candidate)
								)
							)
						);
					}
				};

				peer.onsignalingstatechange	= e => {
					let forceKill: boolean	= e === null;

					if (
						this.peer === peer &&
						(
							forceKill ||
							peer.signalingState === P2P.constants.closed
						)
					) {
						peer.onaddstream	= null;

						this.isAvailable	= false;
						this.remoteStream	= null;
						this.channel		= null;
						this.peer			= null;

						if (forceKill) {
							if (channel) {
								channel.close();
							}

							peer.close();
						}

						if (this.hasSessionStarted) {
							this.initPeer();
						}
					}
				};


				this.peer	= peer;
			}

			private receiveCommand (command: Session.Command) : void {
				if (!WebRTC.isSupported) {
					return;
				}

				if (this.isAccepted && command.method in this.commands) {
					this.commands[command.method](command.argument);
				}
				else if (
					command.method === P2P.constants.video ||
					command.method === P2P.constants.voice ||
					command.method === P2P.constants.file
				) {
					this.triggerUiEvent(
						UIEvents.Categories.request,
						UIEvents.Events.acceptConfirm,
						command.method,
						500000,
						(ok: boolean) => {
							if (ok) {
								this.isAccepted	= true;
								this.setUpStream({
									video: command.method === P2P.constants.video,
									audio: command.method !== P2P.constants.file
								});

								Analytics.main.send({
									hitType: 'event',
									eventCategory: 'call',
									eventAction: 'start',
									eventLabel: command.method,
									eventValue: 1
								});
							}
							else {
								this.session.send(
									new Session.Message(
										Session.RPCEvents.p2p,
										new Session.Command(P2P.constants.decline)
									)
								);
							}
						}
					);
				}
			}

			private receiveIncomingFile (data: ArrayBuffer[], name: string) : void {
				this.triggerUiEvent(
					UIEvents.Categories.file,
					UIEvents.Events.confirm,
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
								UIEvents.Categories.file,
								UIEvents.Events.rejected,
								title
							);
						}
					}
				);
			}

			private retryUntilComplete (f: Function) : void {
				Util.retryUntilComplete(f, () => this.isAccepted);
			}

			private setUpChannel (shouldCreate?: boolean) : void {
				if (!this.isAccepted) {
					return;
				}

				if (shouldCreate) {
					try {
						this.channel	= this.peer.createDataChannel(
							P2P.constants.subspace,
							{
								ordered: true
							}
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
								UIEvents.Categories.file,
								UIEvents.Events.transferStarted,
								Session.Authors.friend,
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

				this.channel.onopen	= () => this.sendFile();
			}

			private triggerUiEvent(
				category: UIEvents.Categories,
				event: UIEvents.Events,
				...args: any[]
			) : void {
				this.session.trigger(Session.Events.p2pUi, {category, event, args});
			}

			public close () : void {
				this.session.send(
					new Session.Message(
						Session.RPCEvents.p2p,
						new Session.Command(P2P.constants.kill)
					)
				);

				this.commands.kill();
			}

			public requestCall (callType: string) : void {
				this.triggerUiEvent(
					UIEvents.Categories.request,
					UIEvents.Events.requestConfirm,
					callType,
					(ok: boolean) => {
						if (ok) {
							this.mutex.lock((wasFirst: boolean, wasFirstOfType: boolean) => {
								try {
									if (wasFirstOfType) {
										this.isAccepted				= true;
										this.outgoingStream.video	= callType === P2P.constants.video;
										this.outgoingStream.audio	= callType !== P2P.constants.file;

										this.session.send(
											new Session.Message(
												Session.RPCEvents.p2p,
												new Session.Command(callType)
											)
										);

										setTimeout(() =>
											this.triggerUiEvent(
												UIEvents.Categories.request,
												UIEvents.Events.requestConfirmation
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
								UIEvents.Categories.file,
								UIEvents.Events.clear
							);
						}
					}
				);
			}

			public sendFile () : void {
				if (
					this.outgoingFile.name ||
					!this.channel ||
					this.channel.readyState !== P2P.constants.open
				) {
					return;
				}

				this.triggerUiEvent(
					UIEvents.Categories.file,
					UIEvents.Events.get,
					(file: File) => {
						this.triggerUiEvent(
							UIEvents.Categories.file,
							UIEvents.Events.clear
						);


						if (file) {
							if (file.size > Config.p2pConfig.maxFileSize) {
								this.triggerUiEvent(
									UIEvents.Categories.file,
									UIEvents.Events.tooLarge
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
								UIEvents.Categories.file,
								UIEvents.Events.transferStarted,
								Session.Authors.me,
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

			public setUpStream (outgoingStream?: any, offer?: string) : void {
				this.retryUntilComplete(retry => {
					if (!offer) {
						if (this.localStreamSetUpLock) {
							retry();
							return;
						}

						this.localStreamSetUpLock	= true;
					}

					this.incomingStream.loading	= true;

					if (outgoingStream) {
						if (outgoingStream.video === true || outgoingStream.video === false) {
							this.outgoingStream.video	= outgoingStream.video;
						}
						if (outgoingStream.audio === true || outgoingStream.audio === false) {
							this.outgoingStream.audio	= outgoingStream.audio;
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
									UIEvents.Categories.stream,
									UIEvents.Events.set,
									Session.Authors.me,
									stream ? URL.createObjectURL(this.localStream) : ''
								);


								for (let o of [
									{k: P2P.constants.audio, f: 'getAudioTracks'},
									{k: P2P.constants.video, f: 'getVideoTracks'}
								]) {
									this.outgoingStream[o.k]	=
										!!this.localStream &&
										this.localStream[o.f]().
											map(track => track.enabled).
											reduce((a, b) => a || b, false)
									;
								}


								let outgoingStream: string	=
									JSON.stringify(this.outgoingStream)
								;

								if (!offer) {
									this.setUpChannel(true);

									this.retryUntilComplete(retry =>
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

											this.retryUntilComplete(retry =>
												this.peer.setLocalDescription(offer, () => {
													this.session.send(
														new Session.Message(
															Session.RPCEvents.p2p,
															new Session.Command(
																P2P.constants.receiveOffer,
																JSON.stringify(offer)
															)
														),
														new Session.Message(
															Session.RPCEvents.p2p,
															new Session.Command(
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
									this.retryUntilComplete(retry =>
										this.peer.setRemoteDescription(
											new WebRTC.SessionDescription(JSON.parse(offer)),
											() =>
												this.retryUntilComplete(retry =>
													this.peer.createAnswer(answer =>
														this.retryUntilComplete(retry =>
															this.peer.setLocalDescription(answer, () => {
																this.session.send(
																	new Session.Message(
																		Session.RPCEvents.p2p,
																		new Session.Command(
																			P2P.constants.receiveAnswer,
																			JSON.stringify(answer)
																		)
																	),
																	new Session.Message(
																		Session.RPCEvents.p2p,
																		new Session.Command(
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
									UIEvents.Categories.base,
									UIEvents.Events.videoToggle,
									true
								);
							};

							streamFallback	= () => {
								if (this.outgoingStream.video) {
									this.outgoingStream.video	= false;
								}
								else if (this.outgoingStream.audio) {
									this.outgoingStream.audio	= false;
								}

								streamSetup();
							};

							streamSetup	= () => {
								if (this.outgoingStream.video || this.outgoingStream.audio) {
									WebRTC.getUserMedia(
										this.outgoingStream,
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
												for (let track of stream.getTracks()) {
													track.enabled	= false;
												}

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

			public constructor (
				private session: Session.ISession,
				private controller: IController
			) {
				this.mutex	= new Session.Mutex(this.session);

				this.session.on(Session.Events.beginChat, () => {
					if (WebRTC.isSupported) {
						this.session.send(
							new Session.Message(
								Session.RPCEvents.p2p,
								new Session.Command
							)
						);
					}
				});

				this.session.on(Session.Events.closeChat, () => this.close());

				this.session.on(Session.RPCEvents.p2p, (command: Session.Command) => {
					if (command.method) {
						this.receiveCommand(command);
					}
					else if (WebRTC.isSupported) {
						this.triggerUiEvent(
							UIEvents.Categories.base,
							UIEvents.Events.enable
						);
					}
				});
			}
		}
	}
}
