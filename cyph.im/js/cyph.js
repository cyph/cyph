var BASE_URL			= 'https://api.cyph.com/';
var authors				= {me: 1, friend: 2, app: 3};
var isHistoryAvailable	= typeof history != 'undefined';
var channel, otr, isConnected;

function addMessageToChat (text, author) {
	if (author == authors.app) {
		console.log('<b>' + text + '</b>');
	}
	else {
		console.log((author == authors.me ? 'me' : 'friend') + ': ' + text);
	}
}

function beginChat () {
	isConnected	= true;

	console.log('connected');

	if (channel.data.IsCreator) {
		console.log('I am the Creator');
	}
}

function cryptoInit () {
	otr	= new OTR({
		fragment_size: 32768,
		send_interval: 200,
		debug: false,
		instance_tag: OTR.makeInstanceTag(),
		priv: new DSA()
	});

	otr.ALLOW_V2			= false;
	otr.ALLOW_V3			= true;
	otr.REQUIRE_ENCRYPTION	= true;

	/*
	otr.on('error', function (error) {
		addMessageToChat('ERROR: ' + error, authors.app);
	});
	*/

	otr.on('ui', function (message, wasEncrypted) {
		if (wasEncrypted) {
			addMessageToChat(message, authors.friend);
		}
	});

	otr.on('io', function (message) {
		/* TODO: figure out wtf is up with these errors and if it's actually a vulnerability */
		if (message != '?OTR Error:An OTR error has occurred.') {
			sendChannelData({Message: message});
		}
	});

	otr.on('status', function (state) {
		if (!isConnected && state == OTR.CONST.STATUS_AKE_SUCCESS) {
			beginChat();
		}
	});
}

function pushState (path, shouldReplace) {
	if (shouldReplace && isHistoryAvailable && history.replaceState) {
		history.replaceState({}, '', path);
	}
	else if (isHistoryAvailable && history.pushState) {
		history.pushState({}, '', path);
	}
	else if (shouldReplace) {
		document.location.replace(path);
		return;
	}
	else {
		document.location.pathname	= path;
		return;
	}

	window.onpopstate();
}

function sendChannelData (o, opts, retries) {
	opts	= opts || {};
	retries	= retries || 0;

	$.ajax({
		async: opts.async == undefined ? true : opts.async,
		data: o,
		dataType: 'json',
		error: function () {
			if (retries < 3) {
				setTimeout(function () { sendChannelData(o, opts, retries + 1) }, 2000);
			}
			else if (opts.errorHandler) {
				opts.errorHandler();
			}
		},
		success: opts.callback,
		type: 'POST',
		url: BASE_URL + 'channels/' + channel.data.ChannelId
	});
}

function sendMessage (message) {
	addMessageToChat(message, authors.me);
	otr.sendMsg(message);
}

function setUpChannel (channelData) {
	channel			= new goog.appengine.Channel(channelData.ChannelToken);
	channel.data	= channelData;

	var socket	= channel.open({
		onopen: function () {},
		onmessage: function (data) {
			var o	= JSON.parse(data.data);

			if (o.Misc == 'ping') {
				sendChannelData({Misc: 'pong'});
			}
			if (o.Message) {
				otr.receiveMsg(o.Message);
			}
			if (o.Destroy) {
				addMessageToChat('friend has terminated chat', authors.app);
				socket.close();
			}
		},
		onerror: function () {},
		onclose: function () {}
	});

	window.addEventListener('beforeunload', function () {
		sendChannelData({Destroy: true}, true);
		socket.close();
	});

	if (!channel.data.IsCreator) {
		otr.sendQueryMsg();

		setTimeout(function () {
			if (!isConnected) {
				statusNotFound();
			}
		}, 60000);
	}
}

function statusNotFound () {
	console.log(404);
}

window.onpopstate	= function () {
	var state	= location.pathname.split('/').last();

	/* New chat room */
	if (state == 'new') {
		$.post(BASE_URL + 'ims', function (id) {
			pushState('/' + id, true);
		});
	}
	/* Join existing chat room */
	else if (state.length == 7) {
		$.ajax({
			dataType: 'json',
			error: statusNotFound,
			success: setUpChannel,
			type: 'POST',
			url: BASE_URL + 'ims/' + state
		});
	}
	/* 404 */
	else {
		statusNotFound();
	}
};

cryptoInit();
window.onpopstate();
