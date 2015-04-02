var authors							= {me: 1, friend: 2, app: 3};
var preConnectMessageReceiveQueue	= [];
var preConnectMessageSendQueue		= [];
var otrWorkerOnMessageQueue			= [];

var isAlive				= false;

var CHANNEL_DATA_PREFIX		= 'CHANNEL DATA: ';
var CHANNEL_RATCHET_PREFIX	= 'CHANNEL RATCHET: ';
var WEBRTC_DATA_PREFIX		= 'WEBRTC: ';
var MUTEX_PREFIX			= 'MUTEX: ';

var SECRET_LENGTH		= 7;
var LONG_SECRET_LENGTH	= 52;

var channelDataMisc	= {
	connect: '1',
	ping: '2',
	pong: '3',
	imtypingyo: '4',
	donetyping: '5'
};

var
	channel,
	newChannel,
	isWebSignObsolete,
	isConnected,
	isCreator,
	isOtrReady,
	hasKeyExchangeBegun,
	lastIncomingMessageTimestamp,
	lastOutgoingMessageTimestamp,
	cyphId,
	shouldAddAffiliateCode,
	sharedSecret,
	shouldStartNewCyph,
	shouldSendQueryMessage
;


/* Init cyph */

var otrWorker		= makeWorker(cryptoWebWorker);

otrWorker.onmessage	= function (e) { otrWorkerOnMessageQueue.push(e) };

var otr	= {
	sendQueryMsg: function () {
		if (isOtrReady) {
			otrWorker && otrWorker.postMessage({method: 1});
		}
		else {
			shouldSendQueryMessage	= true;
		}
	},
	sendMsg: function (message) {
		if (isConnected) {
			otrWorker && otrWorker.postMessage({method: 2, message: message});
		}
		else {
			preConnectMessageSendQueue.push(message);
		}
	},
	receiveMsg: function (message) {
		if (isOtrReady) {
			otrWorker && otrWorker.postMessage({method: 3, message: message});
		}
		else {
			preConnectMessageReceiveQueue.push(message);
		}
	}
};


function otrWorkerOnMessageHandler (e) {
	switch (e.data.eventName) {
		case 'ui':
			if (e.data.message) {
				var channelDataSplit	= e.data.message.split(CHANNEL_DATA_PREFIX);

				if (!channelDataSplit[0] && channelDataSplit[1]) {
					receiveChannelData(JSON.parse(channelDataSplit[1]));
				}
				else {
					addMessageToChat(e.data.message, authors.friend);
				}
			}
			break;

		case 'io':
			sendChannelDataBase({Message: e.data.message});
			logCyphertext(e.data.message, authors.me);
			break;

		case 'ready':
			isOtrReady	= true;

			if (shouldSendQueryMessage) {
				otr.sendQueryMsg();
			}

			while (preConnectMessageReceiveQueue.length) {
				otr.receiveMsg(preConnectMessageReceiveQueue.shift());
			}

			break;

		case 'firstmessage':
			hasKeyExchangeBegun	= true;
			break;

		case 'abort':
			smpError();
			abortSetup();
			break;

		case 'connected':
			isConnected	= true;

			while (preConnectMessageSendQueue.length) {
				otr.sendMsg(preConnectMessageSendQueue.shift());
			}

			if (webRTC.isSupported) {
				sendWebRTCDataToPeer();
			}
			break;

		case 'authenticated':
			markAllAsSent();
			pingPong();

			/* Ratchet channels every 10 - 20 minutes */
			if (e.data.message) {
				function ratchetLoop () {
					setTimeout(
						ratchetLoop,
						600000 + crypto.getRandomValues(new Uint8Array(1))[0] * 2350
					);

					ratchetChannels();
				}

				ratchetLoop();
			}
			break;
	}
}


var randomSeed	= new Uint8Array(50000);
crypto.getRandomValues(randomSeed);


/* TODO: Enable the Walken warning after further testing */

if (
	typeof webSign != 'undefined' &&
	webSign.detectChange &&
	webSign.detectChange() &&
	!WEBSIGN_HASHES[localStorage.webSignBootHash]
) {
	/*
		function warnWebSignObsoleteWrapper () {
			if (typeof warnWebSignObsolete == 'undefined') {
				setTimeout(warnWebSignObsoleteWrapper, 1000);
			}
			else {
				warnWebSignObsolete();
			}
		}

		warnWebSignObsoleteWrapper();
	*/

	webSignError();
}

// else {
$(function () {
	var urlFragment	= getUrlState();

	if (!urlFragment || urlFragment == 'new' || urlFragment.length > (SECRET_LENGTH * 2)) {
		shouldStartNewCyph	= true;
	}

	if (urlFragment && urlFragment.length > SECRET_LENGTH) {
		cyphId			= urlFragment.substr(0, SECRET_LENGTH);
		sharedSecret	= urlFragment.substr(SECRET_LENGTH);
	}

	if (!sharedSecret) {
		sharedSecret	= generateGuid(SECRET_LENGTH);
	}

	otrWorker.postMessage({method: 0, message: {
		cryptoCodes: localStorage.cryptoCodes,
		randomSeed: randomSeed,
		sharedSecret: sharedSecret
	}});


	function startOrJoinCyph (isFirstAttempt) {
		if (cyphId && !isFirstAttempt) {
			pushNotFound();
			return;
		}

		var id	= cyphId || generateGuid(SECRET_LENGTH);
		var o	= shouldStartNewCyph ? {channelDescriptor: getChannelDescriptor()} : null;

		$.ajax({
			type: 'POST',
			url: BASE_URL + 'channels/' + id,
			data: o,
			success: function (channelDescriptor) {
				if (cyphId || !o || channelDescriptor == o.channelDescriptor) {
					cyphId	= id;
					setUpChannel(channelDescriptor);
				}
				else {
					startOrJoinCyph();
				}
			},
			error: function () {
				startOrJoinCyph();
			}
		});
	}

	if (shouldStartNewCyph || cyphId) {
		if (!cyphId) {
			changeState(states.spinningUp);
		}

		history.pushState({}, '', document.location.pathname);
		startOrJoinCyph(true);
	}
	else {
		processUrlState();
	}
});
// }
/* End cyph init */


var connectedNotification	= getString('connectedNotification');
var disconnectWarning		= getString('disconnectWarning');

function beginChat () {
	beginChatUi(function () {
		$(window).on('beforeunload', function () {
			return disconnectWarning;
		});
	});
}


/* Intermittent check to verify chat is still alive + send fake encrypted chatter */

function pingPong () {
	var nextPing	= 0;

	onTick(function (now) {
		if (now - lastIncomingMessageTimestamp > 180000) {
			channelClose();
		}
		else if (now > nextPing) {
			nextPing	= now + (30000 + crypto.getRandomValues(new Uint8Array(1))[0] * 250);
			sendChannelData({Misc: channelDataMisc.ping});
		}
	});
}


function processUrlState () {
	if (isWebSignObsolete) {
		return;
	}

	var urlState	= getUrlState();

	/* 404 */
	if (urlState == '404') {
		changeState(states.error);
	}
	else {
		pushNotFound();
		return;
	}

	history.replaceState({}, '', '/' + getUrlState());
}


var mutex	= {
	owner: null,
	comment: null,
	requester: null,

	commands: {
		release: function () {
			if (mutex.owner != authors.me) {
				mutex.shiftRequester();
			}
		},

		request: function (comment) {
			if (mutex.owner != authors.me) {
				mutex.owner		= authors.friend;
				mutex.comment	= comment;
				mutex.sendCommand({release: true});
			}
			else {
				mutex.requester	= {author: authors.friend, comment: comment};
			}
		},
	},

	lock: function (f, opt_comment) {
		if (mutex.owner != authors.me) {
			if (!mutex.owner && isCreator) {
				mutex.owner		= authors.me;
				mutex.comment	= opt_comment;
			}
			else {
				mutex.requester	= {author: authors.me, comment: opt_comment};
			}

			mutex.sendCommand({request: (opt_comment || '')});
		}

		if (f) {
			var tickId, friendHadLockFirst, friendLockComment;

			var runIfOwner	= function () {
				var isOwner	= mutex.owner == authors.me;

				if (isOwner) {
					tickOff(tickId);

					f(
						!friendHadLockFirst,
						!friendLockComment || friendLockComment != opt_comment,
						friendLockComment
					);
				}
				else if (mutex.owner == authors.friend) {
					friendHadLockFirst	= true;
					friendLockComment	= mutex.comment;
				}

				return isOwner;
			};

			if (!runIfOwner()) {
				tickId	= onTick(runIfOwner);
			}
		}
	},

	sendCommand: function (o) {
		sendChannelData({Misc: MUTEX_PREFIX + (o ? JSON.stringify(o) : '')});
	},

	shiftRequester: function () {
		delete mutex.owner;
		delete mutex.comment;

		if (mutex.requester) {
			mutex.owner		= mutex.requester.author;
			mutex.comment	= mutex.requester.comment;

			delete mutex.requester;
		}
	},

	unlock: function () {
		if (mutex.owner == authors.me) {
			mutex.shiftRequester();
			mutex.sendCommand({release: true});
		}
	}
};


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
				title: getString('videoCallingTitle'),
				content: getString('webRTCDeny'),
				ok: getString('ok')
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
					var webRTCDisconnect	= getString('webRTCDisconnect');

					alertDialog({
						title: getString('videoCallingTitle'),
						content: webRTCDisconnect,
						ok: getString('ok')
					});

					addMessageToChat(webRTCDisconnect, authors.app, false);
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
				addMessageToChat(getString('webRTCConnect'), authors.app, false);
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
					title: getString('videoCallingTitle'),
					content:
						getString('webRTCRequest') + ' ' +
						getString(command + 'Call') + '. ' +
						getString('webRTCWarning')
					,
					ok: getString('continue'),
					cancel: getString('decline')
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
			var title	= getString('incomingFile') + ' ' + name;

			confirmDialog({
				title: title,
				content: getString('incomingFileWarning'),
				ok: getString('save'),
				cancel: getString('reject')
			}, function (ok) {
				if (ok) {
					openUrl(URL.createObjectURL(new Blob(data)), name, true);
				}
				else {
					alertDialog({
						title: title,
						content: getString('incomingFileReject'),
						ok: getString('ok')
					});
				}
			});
		},

		requestCall: function (callType) {
			confirmDialog({
				title: getString('videoCallingTitle'),
				content:
					getString('webRTCInit') + ' ' +
					getString(callType + 'Call') + '. ' +
					getString('webRTCWarning')
				,
				ok: getString('continue'),
				cancel: getString('cancel')
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
										title: getString('videoCallingTitle'),
										content: getString('webRTCRequestConfirmation'),
										ok: getString('ok')
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
			retryUntilSuccessful(f, function () { return webRTC.isAccepted });
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
						title: getString('oopsTitle'),
						content: getString('fileTooLarge'),
						ok: getString('ok')
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

				addMessageToChat(getString('fileTransferInitMe') + ' ' + file.name, authors.app, false);

				webRTC.channel.send(webRTC.fileTransferComplete);

				var reader	= new FileReader;

				reader.onloadend	= function (e) {
					var buf		= e.target.result;
					var pos		= 0;

					updateUI(function () {
						webRTC.outgoingFile.name			= file.name;
						webRTC.outgoingFile.size			= buf.byteLength;
						webRTC.outgoingFile.readableSize	= readableByteLength(webRTC.outgoingFile.size);
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
							webRTC.incomingFile.readableSize	= readableByteLength(webRTC.incomingFile.size);
						});

						addMessageToChat(
							getString('fileTransferInitFriend') + ' ' + webRTC.incomingFile.name,
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
if (!isIOS) {
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



function channelSend () {
	var args	= arguments;

	try {
		channel.send.apply(channel, args);
	}
	catch (e) {
		if (isAlive) {
			setTimeout(function () { channelSend.apply(null, args) }, 500);
		}
	}
}

function channelClose (hasReceivedDestroySignal) {
	webRTC.helpers.kill();

	if (hasReceivedDestroySignal) {
		try {
			newChannel.close(closeChat);
		}
		catch (e) {}
		try {
			channel.close(closeChat);
		}
		catch (e) {}
		try {
			otrWorker.terminate();
		}
		catch (e) {}
		try {
			tickWorker.terminate();
		}
		catch (e) {}

		channel					= null;
		newChannel				= null;
		otrWorker				= null;
		tickWorker				= null;
		tickFunctions.length	= 0;
		tickIntervalHalt		= true;
		mutex.owner				= authors.me;
	}
	else if (isAlive) {
		channelSend({Destroy: true}, closeChat, true);
		setTimeout(function () { channelClose(true) }, 10000);
	}
	else {
		closeChat();
	}
}



var sendChannelDataQueue	= [];

var receiveChannelDataQueue	= [];
var receivedMessages		= {};

function sendChannelData (data) {
	otr.sendMsg(CHANNEL_DATA_PREFIX + JSON.stringify(data));
}

function sendChannelDataBase (data, callback) {
	sendChannelDataQueue.push({data: data, callback: callback});
}

function sendChannelDataHandler (items) {
	lastOutgoingMessageTimestamp	= Date.now();

	channelSend(
		items.map(function (item) {
			item.data.Id	= Date.now() + '-' + crypto.getRandomValues(new Uint32Array(1))[0];
			return item.data;
		}),
		items.map(function (item) { return item.callback })
	);

	anal.send({
		hitType: 'event',
		eventCategory: 'message',
		eventAction: 'sent',
		eventValue: items.length
	});
}

function receiveChannelData (data) {
	receiveChannelDataQueue.push(data);
}

function receiveChannelDataHandler (o) {
	if (!o.Id || !receivedMessages[o.Id]) {
		lastIncomingMessageTimestamp	= Date.now();

		if (o.Misc == channelDataMisc.connect) {
			beginChat();
		}
		else if (o.Misc == channelDataMisc.imtypingyo) {
			friendIsTyping(true);
		}
		else if (o.Misc == channelDataMisc.donetyping) {
			friendIsTyping(false);
		}
		else if (o.Misc && o.Misc.indexOf(WEBRTC_DATA_PREFIX) == 0) {
			var webRTCDataString	= o.Misc.split(WEBRTC_DATA_PREFIX)[1];

			if (webRTCDataString) {
				var webRTCData	= JSON.parse(webRTCDataString);

				Object.keys(webRTCData).forEach(function (key) {
					webRTC.helpers.receiveCommand(key, webRTCData[key]);
				});
			}
			else if (webRTC.isSupported) {
				enableWebRTC();
			}
		}
		else if (o.Misc && o.Misc.indexOf(MUTEX_PREFIX) == 0) {
			var mutexString	= o.Misc.split(MUTEX_PREFIX)[1];

			if (mutexString) {
				var mutexData	= JSON.parse(mutexString);

				Object.keys(mutexData).forEach(function (key) {
					var command	= mutex.commands[key];
					command && command(mutexData[key]);
				});
			}
		}
		else if (o.Misc && o.Misc.indexOf(CHANNEL_RATCHET_PREFIX) == 0) {
			ratchetChannels(o.Misc.split(CHANNEL_RATCHET_PREFIX)[1]);
		}

		if (o.Message) {
			otr.receiveMsg(o.Message);
			logCyphertext(o.Message, authors.friend);
		}

		if (o.Destroy) {
			channelClose(true);
		}

		if (o.Id) {
			receivedMessages[o.Id]	= true;
		}
	}
}

function setUpChannel (channelDescriptor) {
	channel	= new Channel(channelDescriptor, {
		onopen: function (b) {
			isCreator	= b;

			if (isCreator) {
				beginWaiting();
			}
			else {
				beginChat();
				sendChannelDataBase({Misc: channelDataMisc.connect});
				otr.sendQueryMsg();

				anal.send({
					hitType: 'event',
					eventCategory: 'cyph',
					eventAction: 'started',
					eventValue: 1
				});
			}

			$(window).unload(function () {
				channelClose();
			});
		},
		onmessage: receiveChannelData
	});
}



/*
	Alice: create new channel, send descriptor over current channel
	Bob: join new channel, ack descriptor over current channel, deprecate current channel
	Alice: deprecate current channel
	Both: wait a bit, then destroy old channel
*/

var lastChannelRatchet	= 0;

function destroyCurrentChannel () {
	if (newChannel) {
		var oldChannel	= channel;
		channel			= newChannel;
		newChannel		= null;

		setTimeout(function () {
			oldChannel && oldChannel.close();
		}, 150000);
	}
}

function ratchetChannels (channelDescriptor) {
	var init	= !channelDescriptor;

	/* Block ratchet from being initiated more than once within a five-minute period */
	if (init) {
		var last			= lastChannelRatchet;
		lastChannelRatchet	= Date.now();

		if (lastChannelRatchet - last < 300000) {
			return;
		}
	}


	if (newChannel) {
		destroyCurrentChannel();
	}
	else {
		channelDescriptor	= channelDescriptor || getChannelDescriptor();
		newChannel			= new Channel(channelDescriptor, {
			onopen: function () {
				sendChannelData({Misc: CHANNEL_RATCHET_PREFIX + channelDescriptor});

				if (!init) {
					setTimeout(destroyCurrentChannel, 10000);
				}
			},
			onmessage: receiveChannelData,
			onlag: function (lag, region) {
				if (!isCreator) {
					ratchetChannels();
				}

				anal.send({
					hitType: 'event',
					eventCategory: 'sqslag',
					eventAction: 'detected',
					eventLabel: region,
					eventValue: lag
				});
			}
		});
	}
}



/* Event loop for processing incoming messages */

onTick(function (now) {
	/*** send ***/
	if (
		isAlive &&
		sendChannelDataQueue.length &&
		(
			sendChannelDataQueue.length >= 4 ||
			!lastOutgoingMessageTimestamp ||
			(now - lastOutgoingMessageTimestamp) > 500
		)
	) {
		var sendChannelDataQueueSlice	= sendChannelDataQueue.slice(0, 4);
		sendChannelDataQueue			= sendChannelDataQueue.slice(4);

		sendChannelDataHandler(sendChannelDataQueueSlice);
	}

	/*** receive ***/
	else if (receiveChannelDataQueue.length) {
		receiveChannelDataHandler(receiveChannelDataQueue.shift());
	}

	/*** otrWorker onmessage ***/
	else if (otrWorkerOnMessageQueue.length) {
		otrWorkerOnMessageHandler(otrWorkerOnMessageQueue.shift());
	}

	/*** else ***/
	else {
		return false;
	}

	return true;
});



/* Set Analytics information */

anal.set({
	appName: 'cyph.im',
	appVersion: 'Web'
});
