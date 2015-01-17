var channelFrameOrigin		= BASE_URL.slice(0, -1);

var channelFrame			= document.createElement('iframe');
channelFrame.style.display	= 'none';
channelFrame.src			= channelFrameOrigin + '/channelframe';

document.body.appendChild(channelFrame);


var openChannels	= [];

function channelFramePostMessage (message) {
	channelFrame.contentWindow.postMessage(message, channelFrameOrigin);
}


window.addEventListener('message', function (e) {
	if (e.origin == channelFrameOrigin) {
		var o	= openChannels[e.data.id];

		if (o) {
			var f	= o[e.data.eventName];

			if (f) {
				f.apply(null, e.data.args);
			}
		}
	}
});


var goog;
if (!goog) {
	goog	= {};
}
if (!goog.appengine) {
	goog.appengine	= {};
}

goog.appengine.Channel	= function (token) {
	this.id	= openChannels.length;
	openChannels.push(null);

	channelFramePostMessage({method: 'new', token: token, id: this.id});
}

goog.appengine.Channel.prototype.open	= function (o) {
	var id	= this.id;

	openChannels[id]	= o;
	channelFramePostMessage({method: 'open', id: id});

	o.close	= function () {
		channelFramePostMessage({method: 'close', id: id});
	};

	return o;
};
