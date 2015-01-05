var authors							= {me: 1, friend: 2, app: 3};
var preConnectMessageReceiveQueue	= [];
var preConnectMessageSendQueue		= [];

var CHANNEL_DATA_PREFIX	= 'CHANNEL DATA: ';
var WEBRTC_DATA_PREFIX	= 'webrtc: ';

var channelDataMisc	= {
	connect: '1',
	ping: '2',
	pong: '3',
	imtypingyo: '4',
	donetyping: '5'
};

var channel, isConnected, isOtrReady, pongReceived, shouldSendQueryMessage, socket;


/* Init crypto */

var otrWorker	= new Worker('/js/cryptoWebWorker.js');

var sharedSecret		= document.location.hash.split('#')[1];
var sharedSecretLength	= 7;

if (!sharedSecret || sharedSecret.length != sharedSecretLength) {
	var a	= new Uint8Array(sharedSecretLength);
	crypto.getRandomValues(a);

	sharedSecret	= Array.prototype.slice.call(a).
		map(function (n) { return addressSpace[n % addressSpace.length] }).
		join('')
	;
}

otrWorker.onmessage	= function (e) {
	switch (e.data.eventName) {
		case 'ui':
			if (e.data.message) {
				var channelDataSplit	= e.data.message.split(CHANNEL_DATA_PREFIX);

				if (!channelDataSplit[0] && channelDataSplit[1]) {
					receiveChannelData({data: channelDataSplit[1]});
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
			abortSetup();
			break;

		case 'connected':
			isConnected	= true;

			markAllAsSent();

			while (preConnectMessageSendQueue.length) {
				otr.sendMsg(preConnectMessageSendQueue.shift());
			}
			break;
	}
};

var randomSeed	= new Uint8Array(50000);
crypto.getRandomValues(randomSeed);
otrWorker.postMessage({method: 0, message: {
	randomSeed: randomSeed,
	sharedSecret: sharedSecret,
	isInitiator: getUrlState() == 'new'
}});

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

/* End crypto init */


var connectedNotification	= getString('connectedNotification');
var disconnectWarning		= getString('disconnectWarning');

function beginChat () {
	beginChatUi(function () {
		$(window).on('beforeunload', function () {
			return disconnectWarning;
		});

		$(window).unload(function () {
			sendChannelDataBase({Destroy: true}, {async: false});
			socketClose();
		});

		pingPong();
	});
}


/* Intermittent check to verify chat is still alive + send fake encrypted chatter */

function pingPong () {
	if (pongReceived !== false) {
		pongReceived	= false;
	}
	else {
		socketClose();
		return;
	}

	setTimeout(function () {
		sendChannelData({Misc: channelDataMisc.ping});
		setTimeout(pingPong, 60000);
	}, crypto.getRandomValues(new Uint8Array(1))[0] * 250);
}


function processUrlState () {
	var state	= getUrlState();

	/* Root */
	if (state.length == 2 || ['', 'zh-CHS', 'zh-CHT'].indexOf(state) > -1) {
		document.location.replace('https://www.cyph.com/');
	}
	/* New chat room */
	else if (state == 'new') {
		changeState(states.spinningUp);

		$.post(BASE_URL + 'ims', function (id) {
			pushState('/' + id, true);
		});
	}
	/* Join existing chat room */
	else if (state.length == 7) {
		$.ajax({
			dataType: 'json',
			error: pushNotFound,
			success: setUpChannel,
			type: 'POST',
			url: BASE_URL + 'ims/' + state
		});
	}
	/* 404 */
	else {
		changeState(states.error);
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


function socketClose () {
	closeChat(function () {
		socket.close();
	});
}



var sendChannelDataQueue	= [];
var pendingChannelMessages	= 0;

var receiveChannelDataQueue	= [];
var receivedMessages		= {};

function sendChannelDataBase (data, opts) {
	sendChannelDataQueue.push({data: data, opts: opts || {}});
}

function sendChannelData (data) {
	otr.sendMsg(CHANNEL_DATA_PREFIX + JSON.stringify(data));
}

function setUpChannel (channelData) {
	channel			= new goog.appengine.Channel(channelData.ChannelToken);
	channel.data	= channelData;

	socket	= channel.open({
		onopen: function () {
			if (channel.data.IsCreator) {
				beginWaiting();
			}
			else {
				beginChat();
				sendChannelDataBase({Misc: channelDataMisc.connect});
				otr.sendQueryMsg();
			}
		},
		onmessage: function (data) {
			receiveChannelDataQueue.push(data);
		},
		onerror: function () {},
		onclose: closeChat
	});
}

/* Event loop for processing incoming and outgoing messages */

function eventLoop () {
	/* send */
	try {
		if (sendChannelDataQueue.length && pendingChannelMessages < 10) {
			var item	= sendChannelDataQueue.shift();
			var data	= item.data;
			var opts	= item.opts;

			++pendingChannelMessages;

			$.ajax({
				async: opts.async == undefined ? true : opts.async,
				data: data,
				timeout: 25000,
				error: function () {
					sendChannelDataQueue.unshift(item);
				},
				success: function () {
					--pendingChannelMessages;
					opts.callback && opts.callback();
				},
				type: 'POST',
				url: BASE_URL + 'channels/' + channel.data.ChannelId
			});
		}
	}
	catch (e) {}

	/* receive */
	try {
		if (receiveChannelDataQueue.length) {
			var o	= JSON.parse(receiveChannelDataQueue.shift().data);

			pongReceived	= true;

			if (!o.Id || !receivedMessages[o.Id]) {
				if (o.Id) {
					receivedMessages[o.Id]	= true;
					$.ajax({type: 'PUT', url: BASE_URL + 'messages/' + o.Id});
				}

				if (o.Misc == channelDataMisc.ping) {
					sendChannelData({Misc: channelDataMisc.pong});
				}
				else if (o.Misc == channelDataMisc.connect) {
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

				if (o.Message) {
					otr.receiveMsg(o.Message);
					logCyphertext(o.Message, authors.friend);
				}

				if (o.Destroy) {
					socketClose();
				}
			}
		}
	}
	catch (e) {}

	setTimeout(eventLoop, 50);
}

eventLoop();
