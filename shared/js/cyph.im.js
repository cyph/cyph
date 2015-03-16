var authors							= {me: 1, friend: 2, app: 3};
var preConnectMessageReceiveQueue	= [];
var preConnectMessageSendQueue		= [];
var otrWorkerOnMessageQueue			= [];

var isAlive				= false;
var shouldUseOldChannel	= false;

var CHANNEL_DATA_PREFIX		= 'CHANNEL DATA: ';
var CHANNEL_RATCHET_PREFIX	= 'CHANNEL RATCHET: ';
var WEBRTC_DATA_PREFIX		= 'WEBRTC: ';

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
	oldChannel,
	isWebSignObsolete,
	isConnected,
	isOtrReady,
	lastIncomingMessageTimestamp,
	lastOutgoingMessageTimestamp,
	sharedSecret,
	shouldSendQueryMessage
;


/* Init crypto */

var otrWorker		= makeWorker(cryptoWebWorker);

var urlFragment		= document.location.hash.split('#')[1];

if (urlFragment && urlFragment.length == (SECRET_LENGTH * 2)) {
	sharedSecret	= urlFragment.substr(SECRET_LENGTH);
	urlFragment		= urlFragment.substr(0, SECRET_LENGTH);
}

if (urlFragment) {
	history.pushState({}, '', '/' + urlFragment);
}

if (!sharedSecret || sharedSecret.length != SECRET_LENGTH) {
	sharedSecret	= generateGuid(SECRET_LENGTH);
}

otrWorker.onmessage	= function (e) { otrWorkerOnMessageQueue.push(e) };

var otr	= {
	sendQueryMsg: function () {
		if (isOtrReady) {
			otrWorker.postMessage({method: 1});
		}
		else {
			shouldSendQueryMessage	= true;
		}
	},
	sendMsg: function (message) {
		if (isConnected) {
			otrWorker.postMessage({method: 2, message: message});
		}
		else {
			preConnectMessageSendQueue.push(message);
		}
	},
	receiveMsg: function (message) {
		if (isOtrReady) {
			otrWorker.postMessage({method: 3, message: message});
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

		case 'abort':
			smpError();
			abortSetup();
			break;

		case 'connected':
			isConnected	= true;

			while (preConnectMessageSendQueue.length) {
				otr.sendMsg(preConnectMessageSendQueue.shift());
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

otrWorker.postMessage({method: 0, message: {
	cryptoCodes: localStorage.cryptoCodes,
	randomSeed: randomSeed,
	sharedSecret: sharedSecret
}});

// }

/* End crypto init */


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

	/* New chat room */
	if (urlState == 'new' || !urlState) {
		changeState(states.spinningUp);

		function startNewCyph () {
			var id					= generateGuid(SECRET_LENGTH);
			var channelDescriptor	= getChannelDescriptor();

			pushState('/' + id, true, true);

			$.ajax({
				type: 'POST',
				url: BASE_URL + 'channels/' + id,
				data: {channelDescriptor: channelDescriptor},
				success: function (data) {
					if (data == channelDescriptor) {
						setUpChannel(channelDescriptor);
					}
					else {
						startNewCyph();
					}
				},
				error: startNewCyph
			});
		}

		startNewCyph();
	}
	/* Join existing chat room */
	else if (urlState.length == SECRET_LENGTH) {
		$.ajax({
			type: 'POST',
			url: BASE_URL + 'channels/' + urlState,
			success: function (channelDescriptor) {
				setUpChannel(channelDescriptor);
			},
			error: pushNotFound
		});
	}
	/* 404 */
	else if (urlState == '404') {
		changeState(states.error);
	}
	else {
		pushNotFound();
	}
}


/* Logic for handling WebRTC connections (used for file transfers and voice/video chat) */

var PeerConnection		= window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate		= window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription	= window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia	= navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

var webRTC	= {
	channel: null,
	peer: null,

	isAvailable: false,

	isSupported: !!PeerConnection,

	addIceCandidate: function (candidate) {
		webRTC.peer.addIceCandidate(new IceCandidate(JSON.parse(candidate)));
	},

	bindChannelEvents: function () {
		webRTC.channel.onopen		= function () {
			webRTC.isAvailable	= true;
			console.log('WebRTC Channel Open');
		};

		webRTC.channel.onmessage	= function (e) {
			console.log(e.data);
		};
	},

	receiveAnswer: function (answer) {
		webRTC.peer.setRemoteDescription(new SessionDescription(JSON.parse(answer)));
	},

	receiveOffer: function (offer) {
		setUpWebRTC(false);

		webRTC.peer.ondatachannel = function (e) {
			webRTC.channel	= e.channel;
			webRTC.bindChannelEvents();
		};

		webRTC.peer.setRemoteDescription(new SessionDescription(JSON.parse(offer)));

		webRTC.peer.createAnswer(function (answer) {
			webRTC.peer.setLocalDescription(answer);
			sendWebRTCDataToPeer({receiveAnswer: JSON.stringify(answer)});
		});
	}
};

function sendWebRTCDataToPeer (o) {
	sendChannelData({Misc: WEBRTC_DATA_PREFIX + JSON.stringify(o)});
}

function setUpWebRTC (isInitiator) {
	if (!webRTC.isSupported) {
		return;
	}

	/* TODO: Set up Cyph STUN and TURN servers */
	webRTC.peer	= new PeerConnection({
		iceServers: [
			{url: 'stun:23.21.150.121'},
			{url: 'stun:stun.l.google.com:19302'},
			{url: 'turn:numb.viagenie.ca', credential: 'webrtcdemo', username: 'louis%40mozilla.com'}
		]
	}, {
		optional: [
			{DtlsSrtpKeyAgreement: true},
			{RtpDataChannels: true}
		]
	});

	webRTC.peer.onicecandidate	= function (e) {
		if (e.candidate) {
			delete webRTC.peer.onicecandidate;
			sendWebRTCDataToPeer({addIceCandidate: JSON.stringify(e.candidate)});
		}
	};

	if (isInitiator !== false) {
		webRTC.channel	= webRTC.peer.createDataChannel('subspace', {});

		webRTC.bindChannelEvents();

		webRTC.peer.createOffer(function (offer) {
			webRTC.peer.setLocalDescription(offer);
			sendWebRTCDataToPeer({receiveOffer: JSON.stringify(offer)});
		});
	}
}



function channelSend () {
	var c	= (shouldUseOldChannel && oldChannel && oldChannel.isAlive()) ?
		oldChannel :
		channel
	;

	c.send.apply(c, arguments);
}

function channelClose (hasReceivedDestroySignal) {
	if (hasReceivedDestroySignal) {
		channel.close(closeChat);
	}
	else if (isAlive) {
		channelSend({Destroy: true}, closeChat, true);
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
			var webRTCData	= JSON.parse(o.Misc.split(WEBRTC_DATA_PREFIX)[1]);
			var key			= Object.keys(webRTCData)[0];

			if (webRTC[key]) {
				webRTC[key](webRTCData[key]);
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
		onopen: function (isCreator) {
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
	Alice: create new channel, send descriptor over old channel, destroy old-old channel
	Bob: join new channel, ack descriptor over old channel, destroy old-old channel
	Alice: deprecate old channel, inform of deprecation over new channel
	Bob: deprecation old channel
*/

function ratchetChannels (channelDescriptor) {
	if (shouldUseOldChannel) {
		shouldUseOldChannel	= false;

		if (channelDescriptor) {
			sendChannelData({Misc: CHANNEL_RATCHET_PREFIX});
		}
	}
	else {
		oldChannel && oldChannel.close();
		oldChannel			= channel;
		shouldUseOldChannel	= true;

		channelDescriptor	= channelDescriptor || getChannelDescriptor();
		channel				= new Channel(channelDescriptor, {onmessage: receiveChannelData});
		sendChannelData({Misc: CHANNEL_RATCHET_PREFIX + channelDescriptor});
	}
}



/* Event loop for processing incoming messages */

onTick(function (now) {
	/*** send ***/
	if (
		isAlive &&
		sendChannelDataQueue.length &&
		(
			sendChannelDataQueue.length >= 8 ||
			!lastOutgoingMessageTimestamp ||
			(now - lastOutgoingMessageTimestamp) > 500
		)
	) {
		var sendChannelDataQueueSlice	= sendChannelDataQueue.slice(0, 8);
		sendChannelDataQueue			= sendChannelDataQueue.slice(8);

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
