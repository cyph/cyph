var BASE_URL			= 'https://api.cyph.com/';
var authors				= {me: 1, friend: 2, app: 3};
var isHistoryAvailable	= typeof history != 'undefined';
var otrPostInit			= [];
var channel, otr, isConnected, socket;


function cryptoInit () {
	function cryptoInitHelper (key) {
		otr	= new OTR({
			fragment_size: 25600,
			send_interval: 50,
			debug: false,
			instance_tag: OTR.makeInstanceTag(),
			priv: key
		});

		otr.ALLOW_V2			= false;
		otr.ALLOW_V3			= true;
		otr.REQUIRE_ENCRYPTION	= true;

		otr.on('error', function (error) {
			console.log('ERROR: ' + error);
		});

		otr.on('ui', function (message, wasEncrypted) {
			if (wasEncrypted) {
				addMessageToChat(padMessageRemove(message), authors.friend);
			}
		});

		otr.on('io', function (message) {
			/* TODO: figure out wtf is up with these errors and if it's actually a vulnerability */
			if (message != '?OTR Error:An OTR error has occurred.') {
				logCyphertext(message, authors.me);
			}

			sendChannelData({Message: message});
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

		if (otrPostInit[0] === true) {
			otr.sendQueryMsg();
		}
		else {
			while (otrPostInit.length > 0) {
				otr.receiveMsg(otrPostInit.shift());
			}
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

var urlInvalidStarts	= {'!': true, '[': true};
var urlProtocolPattern	= /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
var urlExtensionPattern	= /.*(\.co|\.im|\.me|\.org|\.net|\.io|\.ly|\.edu|\.gov|\.de|\.mil|\.in|\.fm|\.am|\.xxx).*/;

function isValidUrl(s) {
	return !urlInvalidStarts[s[0]] && (urlProtocolPattern.test(s) || urlExtensionPattern.test(s));
}


var paddingDelimiter	= 'PRAISE BE TO CYPH. CYPH IS GOOD; CYPH IS GREAT.';

function getPadding () {
	return Array.prototype.slice.call(
		crypto.getRandomValues(new Uint8Array(crypto.getRandomValues(new Uint8Array(1))[0]))
	).join('');
}

function padMessage (message) {
	return getPadding() + paddingDelimiter + message + paddingDelimiter + getPadding();
}

function padMessageRemove (message) {
	return message.split(paddingDelimiter)[1];
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
}, 50);

function sendChannelData (data, opts) {
	sendChannelDataQueue.push({data: data, opts: opts || {}});
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
					otrPostInit.push(true);
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
						otrPostInit.push(o.Message);
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
		}, 60000);
	}, 90000);
}
