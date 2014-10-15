var BASE_URL			= '//api.cyph.com/';
var authors				= {me: 1, friend: 2, app: 3}
var isHistoryAvailable	= typeof history != 'undefined';

function addMessageToChat (text, author) {
	console.log(arguments);
}

function beginChat (wasWaiting) {
	console.log(arguments);
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

function setUpChannel (channelData) {
	var channel	= goog.appengine.Channel(channelData.ChannelToken);

	function sendMessage (o, opts, retries) {
		$.ajax({
			async: opts.async == undefined ? true : opts.async,
			data: o,
			error: function () {
				retries = retries || 0;

				if (retries < 3) {
					setTimeout(fuction () { sendMessage(o, opts, retries + 1) }, 2000);
				}
				else if (opts.errorHandler) {
					opts.errorHandler();
				}
			},
			type: 'POST',
			url: BASE_URL + 'channels/' + channelData.ChannelId
		});
	}

	var socket	= channel.open({
		onopen: function () {},
		onmessage: function (data) {
			var o	= JSON.parse(data);

			if (o.Misc == 'connect') {
				beginChat(true);
			}
			if (o.Misc == 'ping') {
				sendMessage({Misc: 'pong'});
			}
			if (o.Message) {
				addMessageToChat(o.Message, authors.friend);
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
		sendMessage({Destroy: true}, true);
		socket.close();
	});

	if (channelData.IsCreator) {
		sendMessage({Misc: 'connect'}, {
			callback: function () { beginChat() },
			errorHandler: statusNotFound
		});
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
	statusNotFound();
};

window.onpopstate();
