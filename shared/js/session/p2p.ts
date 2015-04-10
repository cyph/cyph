/// <reference path="session.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../util.ts" />
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

		private $friendPlaceholder: JQuery	= $('#video-call .friend:not(.stream)');
		private $friendStream: JQuery		= $('#video-call .friend.stream');
		private $meStream: JQuery			= $('#video-call .me');
		private filesSelector: string		= '.send-file-button input[type="file"]';

		private commands: {[command: string] : Function}	= {
			'addIceCandidate': (candidate) => {
				if (this.isAvailable) {
					this.peer.addIceCandidate(new P2P.IceCandidate(JSON.parse(candidate)), () => {}, () => {});
				}
				else {
					setTimeout(() => {
						this.commands['addIceCandidate'](candidate);
					}, 500);
				}
			},

			'decline': (answer) => {
				this.isAccepted	= false;

				alertDialog({
					title: Strings.videoCallingTitle,
					content: Strings.webRTCDeny,
					ok: Strings.ok
				});
			},

			'kill': () => {
				let wasAccepted			= this.isAccepted;
				this.isAccepted			= false;
				this.hasSessionStarted	= false;

				toggleVideoCall(false);

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
						alertDialog({
							title: Strings.videoCallingTitle,
							content: Strings.webRTCDisconnect,
							ok: Strings.ok
						});

						addMessageToChat(Strings.webRTCDisconnect, Authors.app, false);
					}
				}, 500);
			},

			'receiveAnswer': (answer) => {
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

			'receiveOffer': (offer) => {
				this.setUpStream(null, offer);
			},

			'streamOptions': (o) => {
				o	= JSON.parse(o);

				updateUI(() => {
					this.incomingStream.video	= o.video === true;
					this.incomingStream.audio	= o.audio === true;

					if (!this.incomingStream.video && !this.incomingStream.audio) {
						delete this.incomingStream.loading;
					}

					if (
						(this.streamOptions.video || this.incomingStream.audio) &&
						!this.incomingStream.video
					) {
						this.$friendPlaceholder[0]['play']();
					}
					else {
						this.$friendPlaceholder[0]['pause']();
					}
				});
			}
		};

		private init () {
			if (this.peer) {
				return;
			}
			else if (!this.hasSessionStarted) {
				this.hasSessionStarted	= true;
				addMessageToChat(Strings.webRTCConnect, Authors.app, false);
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
					let src	= this.$friendStream.attr('src');
					if (src) {
						URL.revokeObjectURL(src);
					}

					this.remoteStream	= e.stream;

					this.$friendStream.attr('src', URL.createObjectURL(this.remoteStream));

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
				confirmDialog({
					title: Strings.videoCallingTitle,
					content:
						Strings.webRTCRequest + ' ' +
						Strings[command + 'Call'] + '. ' +
						Strings.webRTCWarning
					,
					ok: Strings.continueDialogAction,
					cancel: Strings.decline
				}, (ok) => {
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
				}, 500000);
			}
		}

		private receiveIncomingFile (data, name) {
			let title	= Strings.incomingFile + ' ' + name;

			confirmDialog({
				title: title,
				content: Strings.incomingFileWarning,
				ok: Strings.save,
				cancel: Strings.reject
			}, (ok) => {
				if (ok) {
					Util.openUrl(URL.createObjectURL(new Blob(data)), name);
				}
				else {
					alertDialog({
						title: title,
						content: Strings.incomingFileReject,
						ok: Strings.ok
					});
				}
			});
		}

		private requestCall (callType) {
			confirmDialog({
				title: Strings.videoCallingTitle,
				content:
					Strings.webRTCInit + ' ' +
					Strings[callType + 'Call'] + '. ' +
					Strings.webRTCWarning
				,
				ok: Strings.continueDialogAction,
				cancel: Strings.cancel
			}, (ok) => {
				if (ok) {
					this.mutex.lock((wasFirst, wasFirstOfType) => {
						try {
							if (wasFirstOfType) {
								this.isAccepted				= true;
								this.streamOptions.video	= callType == 'video';
								this.streamOptions.audio	= callType != 'file';

								this.session.send(new Message(Events.p2p, new Command(callType)));

								setTimeout(() => {
									alertDialog({
										title: Strings.videoCallingTitle,
										content: Strings.webRTCRequestConfirmation,
										ok: Strings.ok
									});
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
					$(this.filesSelector).each(() => {
						$(this).val('');
					});
				}
			});
		}

		private retry (f) {
			Util.retryUntilComplete(f, () => { return this.isAccepted });
		}

		private sendFile () {
			if (this.outgoingFile.name || !this.channel || this.channel.readyState != 'open') {
				return;
			}

			let $files: JQuery	= $(this.filesSelector);
			let file			= $files.
				map((i, $elem) => $elem['files']).
				toArray().
				reduce((a, b) => { return (a && a[0]) ? a : b }, [])[0]
			;

			$files.each(() => {
				$(this).val('');
			});


			if (file) {
				if (file.size > Config.p2pConfig.maxFileSize) {
					alertDialog({
						title: Strings.oopsTitle,
						content: Strings.fileTooLarge,
						ok: Strings.ok
					});

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

				addMessageToChat(Strings.fileTransferInitMe + ' ' + file.name, Authors.app, false);

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

		private setUpChannel (shouldCreate?) {
			if (!this.isAccepted) {
				return;
			}

			if (shouldCreate) {
				try {
					this.channel	= this.peer.createDataChannel('subspace', {});
				}
				catch (e) {
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

						addMessageToChat(
							Strings.fileTransferInitFriend + ' ' + this.incomingFile.name,
							Authors.app
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

							let src	= this.$meStream.attr('src');
							if (src) {
								URL.revokeObjectURL(src);
							}
						}

						if (stream) {
							if (this.peer.getLocalStreams().length > 0) {
								this.peer.onsignalingstatechange(null);
							}

							this.localStream	= stream;
							this.peer.addStream(this.localStream);
							this.$meStream.attr('src', URL.createObjectURL(this.localStream));
						}

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

						toggleVideoCall(true);
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

		public constructor (session: Session) {
			this.session	= session;
			this.mutex		= new Mutex(this.session);

			this.session.on(Events.p2p, (command: Command) => {
				if (command.method) {
					this.commands[command.method](command.argument);
				}
				else if (P2P.isSupported) {
					enableWebRTC();
				}
			});
			this.session.on(Events.closeChat, this.kill);
		}
	}
}
