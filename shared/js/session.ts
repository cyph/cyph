var authors							= {me: 1, friend: 2, app: 3};
var preConnectMessageReceiveQueue	= [];
var preConnectMessageSendQueue		= [];

var cyphertext	= [];
var messages	= [];

var isAlive	= false;

var
	channel,
	newChannel,
	isConnected,
	isCreator,
	isOtrReady,
	hasKeyExchangeBegun,
	lastIncomingMessageTimestamp,
	lastOutgoingMessageTimestamp,
	cyphId,
	sharedSecret,
	shouldSendQueryMessage
;



/* Init Session */

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
			Errors.logSmp();
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


$(function () {
	var urlFragment	= Util.getUrlState();

	if (!urlFragment || urlFragment == 'new' || urlFragment.length > (Config.secretLength * 2)) {
		shouldStartNewCyph	= true;
	}

	if (urlFragment && urlFragment.length > Config.secretLength) {
		cyphId			= urlFragment.substr(0, Config.secretLength);
		sharedSecret	= urlFragment.substr(Config.secretLength);
	}

	if (!sharedSecret) {
		sharedSecret	= generateGuid(Config.secretLength);
	}

	otrWorker.postMessage({method: 0, message: {
		randomSeed: randomSeed,
		sharedSecret: sharedSecret
	}});


	function startOrJoinCyph (isFirstAttempt) {
		if (cyphId && !isFirstAttempt) {
			Util.pushNotFound();
			return;
		}

		var id	= cyphId || generateGuid(Config.secretLength);
		var o	= shouldStartNewCyph ? {channelDescriptor: getChannelDescriptor()} : null;

		$.ajax({
			type: 'POST',
			url: Env.baseUrl + 'channels/' + id,
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

/* End Init Session */



function beginChat () {
	beginChatUi(function () {
		$(window).on('beforeunload', function () {
			return Strings.disconnectWarning;
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
