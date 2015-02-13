var authors							= {me: 1, friend: 2, app: 3};
var preConnectMessageReceiveQueue	= [];
var preConnectMessageSendQueue		= [];
var otrWorkerOnMessageQueue			= [];

var isAlive	= false;

var CHANNEL_DATA_PREFIX	= 'CHANNEL DATA: ';
var WEBRTC_DATA_PREFIX	= 'webrtc: ';

var SECRET_LENGTH		= 7;
var LONG_SECRET_LENGTH	= 52;

var channelDataMisc	= {
	connect: '1',
	ping: '2',
	pong: '3',
	imtypingyo: '4',
	donetyping: '5'
};

var channel, isWebSignObsolete, isConnected, isOtrReady, pongReceived, sharedSecret, shouldSendQueryMessage, socket;


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
			errorLog('smperrors')();
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
			break;
	}
}


var randomSeed	= new Uint8Array(50000);
crypto.getRandomValues(randomSeed);

var isInitiator	= getUrlState() == 'new';


/* TODO: Consider enabling the Walken warning after further testing */

if (window.webSignObsolete) {
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

	errorLog('websignerrors')();
}

// else {

otrWorker.postMessage({method: 0, message: {
	cryptoCodes: localStorage.cryptoCodes,
	randomSeed: randomSeed,
	sharedSecret: sharedSecret,
	isInitiator: isInitiator
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

		$(window).unload(function () {
			if (isAlive) {
				sendChannelDataBase({Destroy: true});
				socketClose();
			}
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
	}, 30000 + crypto.getRandomValues(new Uint8Array(1))[0] * 250);
}


function processUrlState () {
	if (isWebSignObsolete) {
		return;
	}

	var state	= getUrlState();

	/* Root */
	if (!state) {
		document.location.replace(isOnion ? '/' : 'https://www.cyph.com/');
	}
	/* New chat room */
	else if (state == 'new') {
		changeState(states.spinningUp);

		$.post(BASE_URL + 'ims/' + generateGuid(SECRET_LENGTH) + '/' + generateGuid(LONG_SECRET_LENGTH), function (id) {
			setTimeout(function () {
				pushState('/' + id, true);
			}, 500);
		});
	}
	/* Join existing chat room */
	else if (state.length == SECRET_LENGTH) {
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

function sendChannelData (data) {
	otr.sendMsg(CHANNEL_DATA_PREFIX + JSON.stringify(data));
}

function sendChannelDataBase (data, opts) {
	var item	= {data: data, opts: opts || {}};

	if (item.data.Destroy) {
		item.data.Unloading	= true;
	}

	if (item.data.Unloading) {
		sendChannelDataHandler(item);
	}
	else {
		sendChannelDataQueue.push(item);
	}
}

function sendChannelDataHandler (item) {
	var data	= item.data;
	var opts	= item.opts;

	data.Id		= Date.now() + '-' + crypto.getRandomValues(new Uint32Array(1))[0];

	++pendingChannelMessages;

	$.ajax({
		async: data.Unloading ? false : opts.async !== false,
		data: data,
		timeout: opts.timeout || 30000,
		error: function () {
			sendChannelDataQueue.unshift(item);
			--pendingChannelMessages;
		},
		success: function () {
			--pendingChannelMessages;
			opts.callback && opts.callback();
		},
		type: 'POST',
		url: BASE_URL + 'channels/' + channel.data.ChannelId
	});
}

function receiveChannelData (data) {
	receiveChannelDataQueue.push(data);
}

function receiveChannelDataHandler (item) {
	var o	= JSON.parse(item.data);

	pongReceived	= true;

	if (!o.Id || !receivedMessages[o.Id]) {
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

		if (o.Id) {
			receivedMessages[o.Id]	= true;
		}
	}

	if (o.Id) {
		$.ajax({type: 'PUT', url: BASE_URL + 'messages/' + o.Id});
	}
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
		onmessage: receiveChannelData,
		onerror: function () {},
		onclose: function () {
			closeChat();
		}
	});
}



/* Event loop for processing incoming and outgoing messages */

onTick(function () {
	/*** otrWorker onmessage ***/
	if (otrWorkerOnMessageQueue.length) {
		otrWorkerOnMessageHandler(otrWorkerOnMessageQueue.shift());
	}

	/*** send ***/
	else if (isAlive && sendChannelDataQueue.length && pendingChannelMessages < 2) {
		sendChannelDataHandler(sendChannelDataQueue.shift());
	}

	/*** receive ***/
	else if (receiveChannelDataQueue.length) {
		receiveChannelDataHandler(receiveChannelDataQueue.shift());
	}

	/*** else ***/
	else {
		return false;
	}

	return true;
});
