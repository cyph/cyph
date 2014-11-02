var BASE_URL			= 'https://api.cyph.com/';
var authors				= {me: 1, friend: 2, app: 3};
var isHistoryAvailable	= typeof history != 'undefined';
var channel, otr, isConnected, socket, otrPostInit;

function cryptoInit () {
	function cryptoInitHelper (key) {
		otr	= new OTR({
			fragment_size: 5000,
			send_interval: 200,
			debug: false,
			instance_tag: OTR.makeInstanceTag(),
			priv: key
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
				logCyphertext(message, authors.me);
			}
		});

		var connectedNotification	= getString('connectedNotification');
		var disconnectWarning		= getString('disconnectWarning');
		otr.on('status', function (state) {
			if (!isConnected) {
				if (state == OTR.CONST.STATUS_AKE_SUCCESS) {
					isConnected	= true;

					beginChat();

					$(window).on('beforeunload', function () {
						return disconnectWarning;
					});

					$(window).unload(function () {
						sendChannelData({Destroy: true}, {async: false});
						socket.close();
					});

					notify(connectedNotification);
				}
			}
		});

		if (typeof otrPostInit == 'string') {
			otr.receiveMsg(otrPostInit);
		}
		else if (otrPostInit) {
			otr.sendQueryMsg();
		}
	}

	try {
		DSA.createInWebWorker({path: '/lib/bower_components/otr/dsa-webworker.js'}, cryptoInitHelper);
	}
	catch (e) {
		console.log(e);
		cryptoInitHelper(new DSA());
	}
}

function forceEnglish () {
	localStorage.forceLanguage	= 'en';
	document.location.pathname	= '/new';
}

function getString (name) {
	return $('meta[name="' + name + '"]').attr('content');
}

function getUrlState () {
	return document.location.pathname.split('/').slice(-1)[0];
}

/*
	Note: not using the previous exhaustive/correct valid URL pattern because
	it spikes the CPU to 100% with the string 'aoeuidhtns-aoeuhtns-aoeuidhtns-aoeuidhtns-'
*/
var urlProtocolPattern	= /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
var urlExtensionPattern	= /.*(\.co|\.im|\.me|\.org|\.net|\.io|\.ly|\.edu|\.gov|\.de|\.mil|\.in|\.fm|\.am|\.xxx).*/;
function isValidUrl(s) {
	return urlProtocolPattern.test(s) || urlExtensionPattern.test(s);
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

	processUrlState();
}

function sendChannelData (data, opts, retries) {
	opts	= opts || {};
	retries	= retries || 0;

	$.ajax({
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

	var receivedMessages	= {};
	var pongReceived		= false;
	var pingInterval;

	socket	= channel.open({
		onopen: function () {
			if (channel.data.IsCreator) {
				beginWaiting();
			}
			else {
				changeState(states.settingUpCrypto);

				sendChannelData({Misc: 'connect'});

				if (otr) {
					otr.sendQueryMsg();
				}
				else {
					otrPostInit	= true;
				}

				setTimeout(function () {
					if (!isConnected) {
						abortSetup();
					}
				}, 180000);
			}
		},
		onmessage: function (data) {
			var o	= JSON.parse(data.data);

			if (!receivedMessages[o.Id]) {
				receivedMessages[o.Id]	= true;
				$.ajax({type: 'PUT', url: BASE_URL + 'messages/' + o.Id});

				if (o.Misc == 'ping') {
					sendChannelData({Misc: 'pong'});
				}
				if (o.Misc == 'pong') {
					pongReceived	= true;
				}
				if (o.Misc == 'connect') {
					changeState(states.settingUpCrypto);
				}
				if (o.Message) {
					logCyphertext(o.Message, authors.friend);

					if (otr) {
						otr.receiveMsg(o.Message);
					}
					else {
						otrPostInit	= o.Message;
					}
				}
				if (o.Destroy) {
					socket.close();
				}
			}
		},
		onerror: function () {},
		onclose: function () {
			clearInterval(pingInterval);
			closeChat();
		}
	});

	/* Intermittent check to verify chat is still alive */
	pingInterval	= setInterval(function () {
		pongReceived	= false;
		sendChannelData({Misc: 'ping'});

		setTimeout(function () {
			if (pongReceived == false) {
				socket.close();
			}
		}, 120000);
	}, 300000);
}
