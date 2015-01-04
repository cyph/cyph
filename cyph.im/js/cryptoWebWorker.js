var receivedMessages			= {};
var completeReceivedMessages	= {};
var otr, addressSpace, isInitiator, sharedSecret, processReceivedMessagesTimeoutID;

function getPadding () {
	return Array.prototype.slice.call(
		crypto.getRandomValues(new Uint8Array(crypto.getRandomValues(new Uint8Array(1))[0] + 100))
	).join('');
}

var paddingDelimiter	= '☁☁☁ PRAISE BE TO CYPH ☀☀☀';

function padMessage (message) {
	return btoa(unescape(encodeURIComponent(getPadding() + paddingDelimiter + message + paddingDelimiter + getPadding())));
}

function padMessageRemove (message) {
	return decodeURIComponent(escape(atob(message))).split(paddingDelimiter)[1];
}

function importScriptsAndRetry () {
	for (var i = 0 ; i < arguments.length ; ++i) {
		try {
			importScripts(arguments[i])
		}
		catch (e) {
			if (e.name == 'NetworkError') {
				--i;
			}
			else {
				throw e;
			}
		}
	}
}

function processReceivedMessages () {
	var keys	= Object.keys(completeReceivedMessages).sort(function (a, b) { return a - b });

	for (var i = 0 ; i < keys.length ; ++i) {
		var k	= keys[i];
		postMessage({eventName: 'ui', message: completeReceivedMessages[k]});
		delete completeReceivedMessages[k];
	}
}


onmessage	= function (e) {
	switch (e.data.method) {
		/* Init */
		case 0:
			isInitiator		= e.data.message.isInitiator;
			sharedSecret	= e.data.message.sharedSecret;

			if (true) { //typeof console == 'undefined') {
				var noop	= function () {};
				var methods	= [
					'assert',
					'clear',
					'count',
					'debug',
					'dir',
					'dirxml',
					'error',
					'exception',
					'group',
					'groupCollapsed',
					'groupEnd',
					'info',
					'log',
					'markTimeline',
					'profile',
					'profiles',
					'profileEnd',
					'show',
					'table',
					'time',
					'timeEnd',
					'timeline',
					'timelineEnd',
					'timeStamp',
					'trace',
					'warn'
				];

				console	= {};
				for (var i = 0 ; i < methods.length ; ++i) {
					console[methods[i]]	= noop;
				}

				delete noop;
				delete methods;
			}


			if (typeof crypto == 'undefined') {
				if (typeof msCrypto != 'undefined') {
					crypto	= msCrypto;
				}
				else {
					importScriptsAndRetry('/lib/isaac.min.js');
					isaac.seed(e.data.message.randomSeed);
					crypto	= {
						getRandomValues: function (array) {
							var max	= Math.pow(2, (array.BYTES_PER_ELEMENT || 4) * 8) - 1;

							for (var i = 0 ; i < array.length ; ++i) {
								array[i]	= Math.floor(isaac.random() * max);
							}

							return array;
						}
					};
				}
			}

			window	= {crypto: crypto};

			importScriptsAndRetry(
				'/lib/otr4-em/lib/async.js',
				'/lib/otr4-em/lib/bigint.js',
				'/lib/otr4-em/lib/libotr4.js',
				'/lib/otr4-em/lib/libotr-js-bindings.js',
				'/lib/otr4-em/lib/otr-module.js'
			);


			var accountnames	= {true: 'me', false: 'friend'};

			var settings	= {
				keys:'/keys',
				fingerprints:'/fp',
				instags:'/instags',
				accountname: accountnames[isInitiator],
				protocol: 'cyph'
			};

			var user	= new OTR.User(settings);

			user.generateKey(settings.accountname, settings.protocol, function () {
				user.generateInstag(settings.accountname, settings.protocol, function () {
					otr	= new OTR.Session(
						user,
						user.ConnContext(
							settings.accountname,
							settings.protocol,
							accountnames[!isInitiator]
						), {
						policy: OTR.POLICY('ALLOW_V3'),
						MTU: 30000
					});

					otr.on('smp_request', function () {
						otr.respond_smp(sharedSecret);
					});
					otr.on('smp_complete', function () {
						postMessage({eventName: 'connected'});
					});
					otr.on('smp_failed', function () {
						postMessage({eventName: 'abort'});
					});
					otr.on('smp_aborted', function () {
						postMessage({eventName: 'abort'});
					});

					otr.on('message', function (message, wasEncrypted) {
						if (wasEncrypted) {
							var o	= JSON.parse(message);

							if (!receivedMessages[o.id]) {
								receivedMessages[o.id]	= {
									pieces: [],
									total: 0
								}
							}

							receivedMessages[o.id].pieces[o.index]	= padMessageRemove(o.message);

							if (++receivedMessages[o.id].total == o.total) {
								completeReceivedMessages[o.id]	= receivedMessages[o.id].pieces.join('');
								delete receivedMessages[o.id];

								clearTimeout(processReceivedMessagesTimeoutID);
								processReceivedMessagesTimeoutID	= setTimeout(processReceivedMessages, 1000);
							}
						}
					});

					otr.on('inject_message', function (message) {
						if (message && message.indexOf('otr.cypherpunks.ca') > -1) {
							message	= '?OTRv3?';
						}

						postMessage({eventName: 'io', message: message});
					});

					var isConnected;
					otr.on('gone_secure', function () {
						if (!isConnected) {
							isConnected	= true;
							
							if (isInitiator) {
								otr.start_smp(sharedSecret);
							}
						}
					});

					postMessage({eventName: 'ready'});
				});
			});
			break;

		/* Send query message */
		case 1:
			otr.connect();
			break;

		/* Send message */
		case 2:
			var id			= Date.now();
			var messages	= e.data.message.match(/.{1,5120}/g);

			for (var i = 0 ; i < messages.length ; ++i) {
				otr.send(JSON.stringify({
					id: id,
					index: i,
					total: messages.length,
					message: padMessage(messages[i])
				}));
			}
			break;

		/* Receive message */
		case 3:
			otr.recv(e.data.message);
			break;
	}
};
