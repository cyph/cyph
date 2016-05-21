import {UIEvents} from 'enums';
import {FileTransfer} from 'filetransfer';
import {IFileTransfer} from 'ifiletransfer';
import {IP2P} from 'ip2p';
import {Analytics} from 'cyph/analytics';
import {Config} from 'cyph/config';
import {Env} from 'cyph/env';
import {IController} from 'cyph/icontroller';
import {Timer} from 'cyph/timer';
import {Util} from 'cyph/util';
import {WebRTC} from 'cyph/webrtc';
import {Potassium} from 'crypto/crypto';
import * as Session from 'session/session';


export {
	FileTransfer,
	IFileTransfer,
	IP2P,
	UIEvents
};


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
		subspace: 'subspace',
		video: 'video',
		voice: 'voice'
	};


	private potassium: Potassium;
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
			const wasAccepted: boolean	= this.isAccepted;
			this.isAccepted				= false;
			this.hasSessionStarted		= false;

			this.triggerUiEvent(
				UIEvents.Categories.base,
				UIEvents.Events.videoToggle,
				false
			);

			setTimeout(() => {
				for (const o of [this.outgoingStream, this.incomingStream]) {
					for (const k of Object.keys(o)) {
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
			const o: any	= JSON.parse(options);

			this.incomingStream.video	= o.video === true;
			this.incomingStream.audio	= o.audio === true;

			if (!this.incomingStream.video && !this.incomingStream.audio) {
				this.incomingStream.loading	= false;
			}

			this.controller.update();

			this.triggerUiEvent(
				UIEvents.Categories.stream,
				UIEvents.Events.play,
				Session.Users.app,
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
	public incomingFile: IFileTransfer	= new FileTransfer();
	public outgoingFile: IFileTransfer	= new FileTransfer();

	private initPeer (callback: Function = () => {}) : void {
		if (this.peer) {
			callback();
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

		Util.retryUntilComplete((retry: Function) => Util.request({
			url: Env.baseUrl + Config.p2pConfig.iceServersEndpoint,
			error: retry,
			success: (data: string) => {
				let channel: RTCDataChannel;

				let iceServers: RTCIceServer[]	= JSON.parse(data);
				if (this.forceTURN) {
					iceServers	= iceServers.filter(o => o['url'].indexOf('stun:') !== 0);
				}

				const peer: RTCPeerConnection	= new WebRTC.PeerConnection({iceServers}, {
					optional: [
						{
							DtlsSrtpKeyAgreement: true
						}
					]
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
							Session.Users.friend,
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
					const forceKill: boolean	= e === null;

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
				callback();
			}
		}));
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
				this.isAccepted,
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
					if (this.incomingFile.pendingChunks === 0) {
						const data: ArrayBuffer[]	= this.incomingFile.data;
						const name: string			= this.incomingFile.name;

						if (this.incomingFile.key) {
							Potassium.clearMemory(this.incomingFile.key);
						}

						this.incomingFile.data				= null;
						this.incomingFile.key				= null;
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
						setTimeout(() => this.channel.onmessage(e), 250);
					}
				}
				else {
					const data: string[]	= e.data.split('\n');

					this.incomingFile.data	= [];
					this.incomingFile.name	= data[0];
					this.incomingFile.size	= parseInt(data[1], 10);
					this.incomingFile.key	= Potassium.fromBase64(data[2]);

					this.incomingFile.readableSize	=
						Util.readableByteLength(
							this.incomingFile.size
						)
					;

					this.controller.update();

					this.triggerUiEvent(
						UIEvents.Categories.file,
						UIEvents.Events.transferStarted,
						Session.Users.friend,
						this.incomingFile.name
					);
				}
			}
			else if (this.incomingFile.data) {
				if (e.data instanceof ArrayBuffer) {
					const index: number				= new Uint32Array(
						e.data,
						0,
						1
					)[0];

					const encryptedData: Uint8Array	= new Uint8Array(
						e.data,
						4
					);

					this.potassium.SecretBox.open(
						encryptedData,
						this.incomingFile.key,
						(plaintext: Uint8Array, err) => {
							if (!err) {
								this.incomingFile.data[index]	= plaintext.buffer;

								this.incomingFile.percentComplete	=
									this.incomingFile.data.length *
										Config.p2pConfig.fileChunkSize /
										this.incomingFile.size *
										100
								;

								this.controller.update();
							}
						}
					);
				}
				else {
					++this.incomingFile.pendingChunks;

					const reader: FileReader	= new FileReader();

					reader.onloadend	= readerEvent => {
						this.channel.onmessage({data: readerEvent.target['result']});
						--this.incomingFile.pendingChunks;
					};

					reader.readAsArrayBuffer(e.data);
				}
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

	public preemptivelyAccept () {
		this.isAccepted	= true;
	}

	public requestCall (callType: string) : void {
		this.triggerUiEvent(
			UIEvents.Categories.request,
			UIEvents.Events.requestConfirm,
			callType,
			this.isAccepted,
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
						Session.Users.me,
						file.name
					);

					this.channel.send(P2P.constants.fileTransferComplete);

					const reader: FileReader	= new FileReader();

					reader.onloadend	= e => {
						const buf: ArrayBuffer	= e.target['result'];
						let pos: number			= 0;

						this.outgoingFile.name	= file.name;
						this.outgoingFile.size	= buf.byteLength;

						this.outgoingFile.key	= Potassium.randomBytes(
							this.potassium.SecretBox.keyBytes
						);

						this.outgoingFile.readableSize	=
							Util.readableByteLength(
								this.outgoingFile.size
							)
						;

						this.controller.update();

						this.channel.send(
							this.outgoingFile.name +
							'\n' +
							this.outgoingFile.size +
							'\n' +
							Potassium.toBase64(this.outgoingFile.key)
						);

						const timer: Timer	= new Timer(() => {
							if (!this.isAccepted) {
								timer.stop();
								return;
							}

							const old: number	= pos;
							pos += Config.p2pConfig.fileChunkSize;

							this.potassium.SecretBox.seal(
								new Uint8Array(buf.slice(old, pos)),
								this.outgoingFile.key,
								(encryptedData: Uint8Array, err) => {
									if (err) {
										pos -= Config.p2pConfig.fileChunkSize;
									}
									else {
										const cyphertext: Uint8Array	= new Uint8Array(
											4 + encryptedData.length
										);

										cyphertext.set(new Uint8Array(new Uint32Array([
											old / Config.p2pConfig.fileChunkSize
										]).buffer));

										cyphertext.set(encryptedData, 4);

										this.channel.send(cyphertext.buffer);
									}

									if (buf.byteLength > pos) {
										this.outgoingFile.percentComplete	=
											pos / buf.byteLength * 100
										;

										this.controller.update();
									}
									else {
										timer.stop();

										if (this.outgoingFile.key) {
											Potassium.clearMemory(this.outgoingFile.key);
										}

										this.channel.send(P2P.constants.fileTransferComplete);

										this.outgoingFile.key				= null;
										this.outgoingFile.name				= '';
										this.outgoingFile.size				= 0;
										this.outgoingFile.readableSize		= '';
										this.outgoingFile.percentComplete	= 0;

										this.controller.update();
									}
								}
							);
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
					this.initPeer(() => {
						let streamHelper: Function;
						let streamFallback: Function;
						let streamSetup: Function;

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
								Session.Users.me,
								stream ? URL.createObjectURL(this.localStream) : ''
							);


							for (const o of [
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


							const outgoingStream: string	=
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
									}, retry, <any> {
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
									{
										audio: this.outgoingStream.audio,
										video: this.outgoingStream.video
									},
									streamHelper,
									streamFallback
								);
							}
							else if (this.incomingStream.video || this.incomingStream.audio) {
								try {
									streamHelper(new WebRTC.MediaStream());
								}
								catch (_) {
									WebRTC.getUserMedia(
										{audio: true, video: false},
										stream => {
											for (const track of stream.getTracks()) {
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
					});
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

	/**
	 * @param session
	 * @param controller
	 */
	public constructor (
		private session: Session.ISession,
		private controller: IController,
		private forceTURN: boolean
	) {
		this.potassium	= new Potassium();
		this.mutex		= new Session.Mutex(this.session);

		this.session.on(Session.Events.beginChat, () => {
			if (WebRTC.isSupported) {
				this.session.send(
					new Session.Message(
						Session.RPCEvents.p2p,
						new Session.Command()
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
