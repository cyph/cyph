/* Logic for handling WebRTC connections (used for file transfers and voice/video chat) */

var PeerConnection		= window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate		= window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription	= window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia	= navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

var webRTC	= {
	peer: null,
	channel: null,

	localStream: null,
	remoteStream: null,

	incomingFile: {
		data: null,
		name: null,
		size: null,
		readableSize: null,
		percentComplete: null
	},
	outgoingFile: {
		name: null,
		size: null,
		readableSize: null,
		percentComplete: null
	},

	isAccepted: false,
	isAvailable: false,

	localStreamSetUpLock: false,

	isSupported: !!PeerConnection,

	streamOptions: {},
	incomingStream: {},

	$friendPlaceholder: $('#video-call .friend:not(.stream)'),
	$friendStream: $('#video-call .friend.stream'),
	$meStream: $('#video-call .me'),
	filesSelector: '.send-file-button input[type="file"]',

	iceServer: 'ice.cyph.com',
	chunkSize: 5000,
	maxFileSize: 1100000000,
	fileTransferComplete: 'done',

	commands: {
		addIceCandidate: function (candidate) {
			if (webRTC.isAvailable) {
				webRTC.peer.addIceCandidate(new IceCandidate(JSON.parse(candidate)), function () {}, function () {});
			}
			else {
				setTimeout(function () {
					webRTC.commands.addIceCandidate(candidate);
				}, 500);
			}
		},

		decline: function (answer) {
			webRTC.isAccepted	= false;

			alertDialog({
				title: strings.videoCallingTitle,
				content: strings.webRTCDeny,
				ok: strings.ok
			});
		},

		kill: function () {
			var wasAccepted				= webRTC.isAccepted;
			webRTC.isAccepted			= false;
			webRTC.hasSessionStarted	= false;

			toggleVideoCall(false);

			setTimeout(function () {
				delete webRTC.streamOptions.video;
				delete webRTC.streamOptions.audio;

				delete webRTC.incomingStream.video;
				delete webRTC.incomingStream.audio;

				if (webRTC.localStream) {
					webRTC.localStream.stop();
					delete webRTC.localStream;
				}

				if (webRTC.remoteStream) {
					delete webRTC.remoteStream;
				}

				if (webRTC.peer) {
					try {
						webRTC.peer.close();
					}
					catch (e) {}
				}

				mutex.lock(function () {
					setTimeout(mutex.unlock, 5000);
				});

				if (wasAccepted) {
					alertDialog({
						title: strings.videoCallingTitle,
						content: strings.webRTCDisconnect,
						ok: strings.ok
					});

					addMessageToChat(strings.webRTCDisconnect, authors.app, false);
				}
			}, 500);
		},

		receiveAnswer: function (answer) {
			mutex.lock(function () {
				webRTC.helpers.retry(function (retry) {
					webRTC.peer.setRemoteDescription(
						new SessionDescription(JSON.parse(answer)),
						function () {
							webRTC.isAvailable			= true;
							webRTC.localStreamSetUpLock	= false;
							mutex.unlock();
						},
						retry
					);
				});
			});
		},

		receiveOffer: function (offer) {
			webRTC.helpers.setUpStream(null, offer);
		},

		streamOptions: function (o) {
			o	= JSON.parse(o);

			updateUI(function () {
				webRTC.incomingStream.video	= o.video === true;
				webRTC.incomingStream.audio	= o.audio === true;

				if (!webRTC.incomingStream.video && !webRTC.incomingStream.audio) {
					delete webRTC.incomingStream.loading;
				}

				if (
					(webRTC.streamOptions.video || webRTC.incomingStream.audio) &&
					!webRTC.incomingStream.video
				) {
					webRTC.$friendPlaceholder[0].play();
				}
				else {
					webRTC.$friendPlaceholder[0].pause();
				}
			});
		}
	},

	helpers: {
		init: function () {
			if (webRTC.peer) {
				return;
			}
			else if (!webRTC.hasSessionStarted) {
				webRTC.hasSessionStarted	= true;
				addMessageToChat(strings.webRTCConnect, authors.app, false);
			}

			var dc;
			var pc	= new PeerConnection({
				iceServers: [
					{url: 'stun:' + webRTC.iceServer, credential: 'cyph', username: 'cyph'},
					{url: 'turn:' + webRTC.iceServer, credential: 'cyph', username: 'cyph'}
				]
			}, {
				optional: [{DtlsSrtpKeyAgreement: true}]
			});

			pc.onaddstream	= function (e) {
				if (e.stream && (!webRTC.remoteStream || webRTC.remoteStream.id != e.stream.id)) {
					var src	= webRTC.$friendStream.attr('src');
					if (src) {
						URL.revokeObjectURL(src);
					}

					webRTC.remoteStream	= e.stream;

					webRTC.$friendStream.attr('src', URL.createObjectURL(webRTC.remoteStream));

					setTimeout(function () {
						updateUI(function () {
							delete webRTC.incomingStream.loading;
						});
					}, 1500);
				}
			};

			pc.ondatachannel	= function (e) {
				dc	= e.channel;
				webRTC.channel	= dc;
				webRTC.helpers.setUpChannel();
			};

			pc.onicecandidate	= function (e) {
				if (e.candidate) {
					delete pc.onicecandidate;
					sendWebRTCDataToPeer({addIceCandidate: JSON.stringify(e.candidate)});
				}
			};

			pc.onsignalingstatechange	= function (forceKill) {
				forceKill	= forceKill === true;

				if (webRTC.peer == pc && (forceKill || pc.signalingState == 'closed')) {
					webRTC.isAvailable	= false;

					delete pc.onaddstream;
					delete webRTC.remoteStream;
					delete webRTC.channel;
					delete webRTC.peer;

					if (forceKill) {
						dc && dc.close();
						pc.close();
					}

					if (webRTC.hasSessionStarted) {
						webRTC.helpers.init();
					}
				}
			};


			webRTC.peer	= pc;
		},

		kill: function () {
			sendWebRTCDataToPeer({kill: true});
			webRTC.commands.kill();
		},

		receiveCommand: function (command, data) {
			if (!webRTC.isSupported) {
				return;
			}

			if (webRTC.isAccepted && typeof webRTC.commands[command] == 'function') {
				webRTC.commands[command](data);
			}
			else if (command == 'video' || command == 'voice' || command == 'file') {
				confirmDialog({
					title: strings.videoCallingTitle,
					content:
						strings.webRTCRequest + ' ' +
						strings[command + 'Call'] + '. ' +
						strings.webRTCWarning
					,
					ok: strings.continueDialogAction,
					cancel: strings.decline
				}, function (ok) {
					if (ok) {
						webRTC.isAccepted	= true;
						webRTC.helpers.setUpStream({video: command == 'video', audio: command != 'file'});

						anal.send({
							hitType: 'event',
							eventCategory: 'call',
							eventAction: 'start',
							eventLabel: command,
							eventValue: 1
						});
					}
					else {
						sendWebRTCDataToPeer({decline: true});
					}
				}, 500000);
			}
		},

		receiveIncomingFile: function (data, name) {
			var title	= strings.incomingFile + ' ' + name;

			confirmDialog({
				title: title,
				content: strings.incomingFileWarning,
				ok: strings.save,
				cancel: strings.reject
			}, function (ok) {
				if (ok) {
					util.openUrl(URL.createObjectURL(new Blob(data)), name, true);
				}
				else {
					alertDialog({
						title: title,
						content: strings.incomingFileReject,
						ok: strings.ok
					});
				}
			});
		},

		requestCall: function (callType) {
			confirmDialog({
				title: strings.videoCallingTitle,
				content:
					strings.webRTCInit + ' ' +
					strings[callType + 'Call'] + '. ' +
					strings.webRTCWarning
				,
				ok: strings.continueDialogAction,
				cancel: strings.cancel
			}, function (ok) {
				if (ok) {
					mutex.lock(function (wasFirst, wasFirstOfType) {
						try {
							if (wasFirstOfType) {
								webRTC.isAccepted			= true;
								webRTC.streamOptions.video	= callType == 'video';
								webRTC.streamOptions.audio	= callType != 'file';

								var o		= {};
								o[callType]	= true;
								sendWebRTCDataToPeer(o);

								setTimeout(function () {
									alertDialog({
										title: strings.videoCallingTitle,
										content: strings.webRTCRequestConfirmation,
										ok: strings.ok
									});
								}, 250);

								/* Time out if request hasn't been accepted within 10 minutes */
								setTimeout(function () {
									if (!webRTC.isAvailable) {
										webRTC.isAccepted	= false;
									}
								}, 600000);
							}
						}
						finally {
							mutex.unlock();
						}
					}, 'requestCall');
				}
				else {
					$(webRTC.filesSelector).each(function () {
						$(this).val('');
					});
				}
			});
		},

		retry: function (f) {
			util.retryUntilSuccessful(f, function () { return webRTC.isAccepted });
		},

		sendFile: function () {
			if (webRTC.outgoingFile.name || !webRTC.channel || webRTC.channel.readyState != 'open') {
				return;
			}

			var $files	= $(webRTC.filesSelector);
			var file	= $files.
				map(function () { return this.files }).
				toArray().
				reduce(function (a, b) { return (a && a[0]) ? a : b }, [])[0]
			;

			$files.each(function () {
				$(this).val('');
			});


			if (file) {
				if (file.size > webRTC.maxFileSize) {
					alertDialog({
						title: strings.oopsTitle,
						content: strings.fileTooLarge,
						ok: strings.ok
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

				addMessageToChat(strings.fileTransferInitMe + ' ' + file.name, authors.app, false);

				webRTC.channel.send(webRTC.fileTransferComplete);

				var reader	= new FileReader;

				reader.onloadend	= function (e) {
					var buf		= e.target.result;
					var pos		= 0;

					updateUI(function () {
						webRTC.outgoingFile.name			= file.name;
						webRTC.outgoingFile.size			= buf.byteLength;
						webRTC.outgoingFile.readableSize	= util.readableByteLength(webRTC.outgoingFile.size);
					});
					webRTC.channel.send(webRTC.outgoingFile.name + '\n' + webRTC.outgoingFile.size);

					var tickId	= onTick(function () {
						if (!webRTC.isAccepted) {
							tickOff(tickId);
							return;
						}

						try {
							for (var i = 0 ; i < 10 ; ++i) {
								var old	= pos;
								pos += webRTC.chunkSize;
								webRTC.channel.send(buf.slice(old, pos));
							}
						}
						catch (e) {
							pos -= webRTC.chunkSize;
						}

						if (buf.byteLength > pos) {
							updateUI(function () {
								webRTC.outgoingFile.percentComplete	= pos / buf.byteLength * 100;
							});
						}
						else {
							tickOff(tickId);

							webRTC.channel.send(webRTC.fileTransferComplete);

							updateUI(function () {
								delete webRTC.outgoingFile.name;
								delete webRTC.outgoingFile.size;
								delete webRTC.outgoingFile.readableSize;
								delete webRTC.outgoingFile.percentComplete;
							});
						}
					});
				};

				reader.readAsArrayBuffer(file);
			}
		},

		setUpChannel: function (shouldCreate) {
			if (!webRTC.isAccepted) {
				return;
			}

			if (shouldCreate) {
				try {
					webRTC.channel	= webRTC.peer.createDataChannel('subspace', {});
				}
				catch (e) {
					setTimeout(function () { webRTC.helpers.setUpChannel(true) }, 500);
					return;
				}
			}

			webRTC.channel.onmessage	= function (e) {
				if (typeof e.data == 'string') {
					if (e.data == webRTC.fileTransferComplete) {
						var data	= webRTC.incomingFile.data;
						var name	= webRTC.incomingFile.name;

						updateUI(function () {
							delete webRTC.incomingFile.data;
							delete webRTC.incomingFile.name;
							delete webRTC.incomingFile.size;
							delete webRTC.incomingFile.readableSize;
							delete webRTC.incomingFile.percentComplete;
						});

						if (data) {
							webRTC.helpers.receiveIncomingFile(data, name);
						}
					}
					else {
						var data	= e.data.split('\n');

						updateUI(function () {
							webRTC.incomingFile.data			= [];
							webRTC.incomingFile.name			= data[0];
							webRTC.incomingFile.size			= parseInt(data[1], 10);
							webRTC.incomingFile.readableSize	= util.readableByteLength(webRTC.incomingFile.size);
						});

						addMessageToChat(
							strings.fileTransferInitFriend + ' ' + webRTC.incomingFile.name,
							authors.app
						);
					}
				}
				else if (webRTC.incomingFile.data) {
					webRTC.incomingFile.data.push(e.data);

					updateUI(function () {
						webRTC.incomingFile.percentComplete	=
							webRTC.incomingFile.data.length *
								webRTC.chunkSize /
								webRTC.incomingFile.size *
								100
						;
					});
				}
			};

			webRTC.channel.onopen	= webRTC.helpers.sendFile;
		},

		setUpStream: function (opt_streamOptions, opt_offer) {
			var retry	= function () {
				if (webRTC.isAccepted) {
					setTimeout(function () {
						webRTC.helpers.setUpStream(opt_streamOptions);
					}, 100);
				}
			};

			if (!opt_offer) {
				if (webRTC.localStreamSetUpLock) {
					retry();
					return;
				}

				webRTC.localStreamSetUpLock	= true;
			}

			webRTC.incomingStream.loading	= true;

			if (opt_streamOptions) {
				if (opt_streamOptions.video === true || opt_streamOptions.video === false) {
					webRTC.streamOptions.video	= opt_streamOptions.video;
				}
				if (opt_streamOptions.audio === true || opt_streamOptions.audio === false) {
					webRTC.streamOptions.audio	= opt_streamOptions.audio;
				}
			}

			mutex.lock(function (wasFirst, wasFirstOfType) {
				if (wasFirstOfType && webRTC.isAccepted) {
					webRTC.helpers.init();

					var streamHelper, streamFallback, streamSetup;

					streamHelper	= function (stream) {
						if (!webRTC.isAccepted) {
							return;
						}

						if (webRTC.localStream) {
							webRTC.localStream.stop();
							delete webRTC.localStream;

							var src	= webRTC.$meStream.attr('src');
							if (src) {
								URL.revokeObjectURL(src);
							}
						}

						if (stream) {
							if (webRTC.peer.getLocalStreams().length > 0) {
								webRTC.peer.onsignalingstatechange(true);
							}

							webRTC.localStream	= stream;
							webRTC.peer.addStream(webRTC.localStream);
							webRTC.$meStream.attr('src', URL.createObjectURL(webRTC.localStream));
						}

						[
							{k: 'audio', f: 'getAudioTracks'},
							{k: 'video', f: 'getVideoTracks'}
						].forEach(function (o) {
							webRTC.streamOptions[o.k]	= !!webRTC.localStream && webRTC.localStream[o.f]().
								map(function (track) { return track.enabled }).
								reduce(function (a, b) { return a || b }, false)
							;
						});


						var outgoingStream	= JSON.stringify(webRTC.streamOptions);

						if (!opt_offer) {
							webRTC.helpers.setUpChannel(true);

							webRTC.helpers.retry(function (retry) {
								webRTC.peer.createOffer(function (offer) {
									/* http://www.kapejod.org/en/2014/05/28/ */
									offer.sdp	= offer.sdp.
										split('\n').
										filter(function (line) {
											return line.indexOf('urn:ietf:params:rtp-hdrext:ssrc-audio-level') < 0 &&
												line.indexOf('b=AS:') < 0
											;
										}).
										join('\n')
									;

									webRTC.helpers.retry(function (retry) {
										webRTC.peer.setLocalDescription(offer, function () {
											sendWebRTCDataToPeer({
												receiveOffer: JSON.stringify(offer),
												streamOptions: outgoingStream
											});

											mutex.unlock();
										}, retry);
									});
								}, retry, {
									offerToReceiveAudio: true,
									offerToReceiveVideo: true
								});
							});
						}
						else {
							webRTC.helpers.retry(function (retry) {
								webRTC.peer.setRemoteDescription(
									new SessionDescription(JSON.parse(opt_offer)),
									function () {
										webRTC.helpers.retry(function (retry) {
											webRTC.peer.createAnswer(function (answer) {
												webRTC.helpers.retry(function (retry) {
													webRTC.peer.setLocalDescription(answer, function () {
														sendWebRTCDataToPeer({
															receiveAnswer: JSON.stringify(answer),
															streamOptions: outgoingStream
														});

														webRTC.isAvailable	= true;

														mutex.unlock();
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

					streamFallback	= function () {
						if (webRTC.streamOptions.video) {
							webRTC.streamOptions.video	= false;
						}
						else if (webRTC.streamOptions.audio) {
							webRTC.streamOptions.audio	= false;
						}

						streamSetup();
					};

					streamSetup	= function () {
						if (webRTC.streamOptions.video || webRTC.streamOptions.audio) {
							navigator.getUserMedia(webRTC.streamOptions, streamHelper, streamFallback);
						}
						else if (webRTC.incomingStream.video || webRTC.incomingStream.audio) {
							try {
								streamHelper(new (window.webkitMediaStream || window.MediaStream));
							}
							catch (e) {
								navigator.getUserMedia({audio: true}, function (stream) {
									stream.getTracks().forEach(function (track) {
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
					if (opt_offer) {
						mutex.unlock();
					}
					else {
						webRTC.localStreamSetUpLock	= false;
						retry();
					}
				}
			}, 'setUpStream' + (opt_offer ? '' : 'Init'));
		}
	}
};

/* Mobile workaround */
if (env.isMobile && !env.isIOS) {
	$(function () {
		webRTC.$friendPlaceholder[0].pause();

		$(window).one('click', function () {
			webRTC.$friendPlaceholder[0].play();
			setTimeout(function () { webRTC.$friendPlaceholder[0].pause() }, 3000);
		});
	});
}

function sendWebRTCDataToPeer (o) {
	sendChannelData({Misc: WEBRTC_DATA_PREFIX + (o ? JSON.stringify(o) : '')});
}
