var anal	= (function () {
	var analFrame;

	/* No analytics for Tor users, but supporting it here just in case */
	if (!isOnion) {
		analFrame				= document.createElement('iframe');
		var analFrameOrigin		= isOnion ? ONION_URL : BASE_URL.slice(0, -1);
		var analFrameIsReady	= false;

		analFrame.style.display	= 'none';

		analFrame.src			=
			analFrameOrigin +
			(isOnion ? BASE_URL : '/') +
			'anal/' +
			location.host.replace('www.', '') + location.pathname + location.search +
			(
				document.referrer && !/https:\/\/www.cyph.[a-z]+\//.test(document.referrer) ?
				('?ref=' + encodeURIComponent(document.referrer)) :
				''
			)
		;

		document.body.appendChild(analFrame);

		function analFramePostMessage (message) {
			analFrame.contentWindow.postMessage(message, '*');
		}

		$(function () {
			$(analFrame).load(function () {
				setTimeout(function () {
					analFrameIsReady	= true;
				}, 250);
			});
		});
	}


	/*
		Disabling callback logic until we actually need it


		var callbacks			= {};
		var callbackCount		= 0;
		var receiveMessageQueue	= [];

		function callback (f) {
			if (!f) {
				return null;
			}

			var callbackId			= ++callbackCount;
			callbacks[callbackId]	= f;
			return {callbackId: callbackId};
		}

		window.addEventListener('message', function (e) {
			if (e.origin == analFrameOrigin) {
				receiveMessageQueue.push(e);
			}
		});

		onTick(function () {
			if (receiveMessageQueue.length) {
				var e	= receiveMessageQueue.shift();
				var f	= callbacks[e.data.callbackId];

				if (f) {
					f.apply(null, JSON.parse(e.data.args));
				}

				return true;
			}

			return false;
		});
	*/


	var wrapper	= {};

	/* Add methods that take an arbitrary list of args;
		they all do nothing if analytics is flagged off */
	[
		'send',
		'set'
	].forEach(function (methodName) {
		wrapper[methodName]	= analFrame ?
			function () {
				var args	= Array.prototype.slice.apply(arguments);
				args.unshift(methodName);

				function wrapperHelper () {
					if (analFrameIsReady) {
						analFramePostMessage({args: JSON.stringify(args)});
					}
					else {
						setTimeout(wrapperHelper, 50);
					}
				}

				wrapperHelper();
			} :
			function () {}
		;
	});

	return wrapper;
}());
