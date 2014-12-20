var authors							= {me: 1, friend: 2, app: 3};
var preConnectMessageReceiveQueue	= [];
var preConnectMessageSendQueue		= [];

var CHANNEL_DATA_PREFIX	= 'CHANNEL DATA: ';

var channelDataMisc	= {
	connect: 1,
	ping: 2,
	pong: 3,
	imtypingyo: 4,
	donetyping: 5
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

			var i	= 0;
			while (preConnectMessageReceiveQueue.length > 0) {
				(function () {
					var message	= preConnectMessageReceiveQueue.shift();
					setTimeout(function () {
						otr.receiveMsg(message);
					}, 50 * i++);
				}());
			}

			break;

		case 'abort':
			abortSetup();
			break;

		case 'connected':
			isConnected	= true;

			markAllAsSent();

			var i	= 0;
			while (preConnectMessageSendQueue.length > 0) {
				(function () {
					var message	= preConnectMessageSendQueue.shift();
					setTimeout(function () {
						otr.sendMsg(message);
					}, 50 * i++);
				}());
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


var receivedMessages	= {};

function receiveChannelData (data) {
	var o;

	try {
		o	= JSON.parse(data.data);
	}
	catch (e) {
		return;
	}

	pongReceived	= true;

	if (!o.Id || !receivedMessages[o.Id]) {
		if (o.Id) {
			receivedMessages[o.Id]	= true;
			$.ajax({type: 'PUT', url: BASE_URL + 'messages/' + o.Id});
		}

		if (o.Misc == channelDataMisc.ping) {
			sendChannelData({Misc: channelDataMisc.pong});
		}
		if (o.Misc == channelDataMisc.connect) {
			beginChat();
		}
		if (o.Misc == channelDataMisc.imtypingyo) {
			friendIsTyping(true);
		}
		if (o.Misc == channelDataMisc.donetyping) {
			friendIsTyping(false);
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


var sendChannelDataLock		= false;
var sendChannelDataQueue	= [];

setInterval(function () {
	if (sendChannelDataLock || sendChannelDataQueue.length < 1) {
		return;
	}

	sendChannelDataLock	= true;

	var item	= sendChannelDataQueue.shift();
	var data	= item.data;
	var opts	= item.opts;

	$.ajax({
		async: opts.async == undefined ? true : opts.async,
		data: data,
		error: function () {
			sendChannelDataQueue.unshift(item);
			sendChannelDataLock	= false;
		},
		success: function () {
			sendChannelDataLock	= false;
			opts.callback && opts.callback();
		},
		type: 'POST',
		url: BASE_URL + 'channels/' + channel.data.ChannelId
	});
}, 100);

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
		onmessage: receiveChannelData,
		onerror: function () {},
		onclose: closeChat
	});
}


function socketClose () {
	closeChat(function () {
		socket.close();
	});
}
