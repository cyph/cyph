var authors							= {me: 1, friend: 2, app: 3};
var preConnectMessageReceiveQueue	= [];
var preConnectMessageSendQueue		= [];
var channel, isConnected, isOtrReady, pongReceived, shouldSendQueryMessage, socket;


/* Init crypto */

var otrWorker	= new Worker('/js/cryptoWebWorker.js');

otrWorker.onmessage	= function (e) {
	switch (e.data.eventName) {
		case 'ui':
			addMessageToChat(e.data.message, authors.friend);
			break;

		case 'io':
			sendChannelData({Message: e.data.message});
			logCyphertext(e.data.message, authors.me);
			break;

		case 'connected':
			if (!isConnected) {
				isConnected	= true;

				markAllAsSent();

				while (preConnectMessageSendQueue.length > 0) {
					otr.sendMsg(preConnectMessageSendQueue.shift());
				}
			}
			break;

		case 'ready':
			isOtrReady	= true;

			if (shouldSendQueryMessage) {
				otr.sendQueryMsg();
			}

			while (preConnectMessageReceiveQueue.length > 0) {
				otr.receiveMsg(preConnectMessageReceiveQueue.shift());
			}

			break;
	}
};

var randomSeed	= new Uint8Array(50000);
crypto.getRandomValues(randomSeed);
otrWorker.postMessage({method: 0, message: randomSeed});

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
			sendChannelData({Destroy: true}, {async: false});
			socketClose();
		});

		/* Intermittent check to verify chat is still alive */
		var pingInterval	= setInterval(function () { sendChannelData({Misc: 'ping'}) }, 15000);
		var pongInterval	= setInterval(function () {
			if (pongReceived) {
				pongReceived	= false;
			}
			else {
				clearInterval(pingInterval);
				clearInterval(pongInterval);
				socketClose();
			}
		}, 60000);
	});
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

function sendChannelData (data, opts) {
	sendChannelDataQueue.push({data: data, opts: opts || {}});
}


function setUpChannel (channelData) {
	channel			= new goog.appengine.Channel(channelData.ChannelToken);
	channel.data	= channelData;

	var receivedMessages	= {};

	socket	= channel.open({
		onopen: function () {
			if (channel.data.IsCreator) {
				beginWaiting();
			}
			else {
				beginChat();
				sendChannelData({Misc: 'connect'});
				otr.sendQueryMsg();
			}
		},
		onmessage: function (data) {
			var o

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

				if (o.Misc == 'ping') {
					sendChannelData({Misc: 'pong'});
				}
				if (o.Misc == 'connect') {
					beginChat();
				}
				if (o.Misc == 'imtypingyo') {
					friendIsTyping(true);
				}
				if (o.Misc == 'donetyping') {
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
		},
		onerror: function () {},
		onclose: closeChat
	});
}


function socketClose () {
	closeChat(function () {
		socket.close();
	});
}
