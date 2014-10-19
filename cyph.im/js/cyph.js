var BASE_URL			= 'https://api.cyph.com/';
var authors				= {me: 1, friend: 2, app: 3};
var isHistoryAvailable	= typeof history != 'undefined';
var channel, otr, isConnected, socket;

function ajax (o) {
	var req	= new XMLHttpRequest();

	req.open(o.type, o.url, o.async);

	function dothemove () {
		var response	= req.responseText;
		if (response && o.dataType == 'json') {
			response	= JSON.parse(response);
		}

		if (req.status == 200) {
			o.success && o.success(response);
		}
		else {
			o.error && o.error(response);
		}
	}

	if (o.async !== false) {
		req.onreadystatechange	= function () {
			if (req.readyState == 4) {
				dothemove();
			}
		};
	}

	var data	= o.data;
	if (typeof data == 'object') {
		data	= Object.keys(data).map(function (k) {
			return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
		}).join('&');

		req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	}
	req.send(data);

	if (o.async === false) {
		dothemove();
	}
}

function cryptoInit () {
	otr	= new OTR({
		fragment_size: 5000,
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
			isConnected	= true;
			beginChat();
		}
	});
}

function pushNotFound () {
	pushState('/404');
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

function sendChannelData (data, opts, retries) {
	opts	= opts || {};
	retries	= retries || 0;

	ajax({
		async: opts.async == undefined ? true : opts.async,
		data: data,
		error: function () {
			if (retries < 3) {
				setTimeout(function () { sendChannelData(data, opts, retries + 1) }, 2000);
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

function setUpChannel (channelData) {
	channel			= new goog.appengine.Channel(channelData.ChannelToken);
	channel.data	= channelData;

	var isDead		= false;

	socket	= channel.open({
		onopen: function () {},
		onmessage: function (data) {
			var o	= JSON.parse(data.data);

			if (o.Misc == 'ping') {
				sendChannelData({Misc: 'pong'});
			}
			if (o.Message) {
				otr.receiveMsg(o.Message);
			}
			if (o.Destroy && !isDead) {
				isDead	= true;
				closeChat();
				socket.close();
			}
		},
		onerror: function () {},
		onclose: function () {}
	});

	window.addEventListener('beforeunload', function () {
		sendChannelData({Destroy: true});
		socket.close();
	});

	if (!channel.data.IsCreator) {
		otr.sendQueryMsg();

		setTimeout(function () {
			if (!isConnected) {
				pushNotFound();
			}
		}, 180000);
	}
}

window.onpopstate	= function () {
	var state	= document.location.pathname.split('/').slice(-1)[0];

	/* Root */
	if (state == '') {
		document.location.replace('https://www.cyph.com/');
	}
	/* New chat room */
	else if (state == 'new') {
		ajax({
			success: function (id) {
				pushState('/' + id, true);
			},
			type: 'POST',
			url: BASE_URL + 'ims'
		});
	}
	/* Join existing chat room */
	else if (state.length == 7) {
		ajax({
			dataType: 'json',
			error: pushNotFound,
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
