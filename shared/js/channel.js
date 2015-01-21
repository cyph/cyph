var goog;
if (!goog) {
	goog	= {};
}
if (!goog.appengine) {
	goog.appengine	= {};
}

goog.appengine.Channel	= (function () {


var channelFrame				= document.createElement('iframe');
var channelFrameOrigin			= BASE_URL.slice(0, -1);
var isChannelFrameReady			= false;
var channelFrameMessageQueue	= [];
var receiveMessageQueue			= [];
var openChannels				= [];
var channelFramePingInterval;

function channelFramePostMessage (message, ping) {
	if (isChannelFrameReady || ping) {
		channelFrame.contentWindow.postMessage(message, channelFrameOrigin);
	}
	else {
		channelFrameMessageQueue.push(message);
	}
}

window.addEventListener('message', function (e) {
	if (e.origin == channelFrameOrigin) {
		receiveMessageQueue.push(e);
	}
});


onTick(function () {
	if (receiveMessageQueue.length) {
		var e	= receiveMessageQueue.shift();

		if (e.data.pong) {
			clearInterval(channelFramePingInterval);
			isChannelFrameReady	= true;

			while (channelFrameMessageQueue.length) {
				channelFramePostMessage(channelFrameMessageQueue.shift());
			}

			return;
		}

		var o	= openChannels[e.data.id];

		if (o) {
			var f	= o[e.data.eventName];

			if (f) {
				f.apply(null, e.data.args);
			}
		}
	}

	else {
		return false;
	}

	return true;
});


channelFrame.style.display	= 'none';
channelFrame.src			= channelFrameOrigin + '/channelframe';

document.body.appendChild(channelFrame);

channelFramePingInterval	= setInterval(function () {
	channelFramePostMessage({}, true);
}, 100);


function channel (token) {
	this.id	= openChannels.length;
	openChannels.push(null);

	channelFramePostMessage({method: 'new', token: token, id: this.id});
}

channel.prototype.open	= function (o) {
	var id	= this.id;

	openChannels[id]	= o;
	channelFramePostMessage({method: 'open', id: id});

	o.close	= function () {
		channelFramePostMessage({method: 'close', id: id});
	};

	return o;
};


return channel;


}());
