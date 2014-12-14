var otr, addressSpace, isInitiator, sharedSecret;

function getPadding () {
	return Array.prototype.slice.call(
		crypto.getRandomValues(new Uint8Array(crypto.getRandomValues(new Uint8Array(1))[0] + 100))
	).join('');
}

var paddingDelimiter	= '☁☁☁ PRAISE BE TO CYPH ☀☀☀';

function padMessage (message) {
	return getPadding() + paddingDelimiter + message + paddingDelimiter + getPadding();
}

function padMessageRemove (message) {
	return message.split(paddingDelimiter)[1];
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

function sendFakeMessage () {
	otr.send(getPadding() + paddingDelimiter + getPadding() + paddingDelimiter + getPadding());
	setTimeout(sendFakeMessage, crypto.getRandomValues(new Uint8Array(1))[0] * 500);
}


onmessage	= function (e) {
	switch (e.data.method) {
		/* Init */
		case 0:
			isInitiator		= e.data.message.isInitiator;
			sharedSecret	= e.data.message.sharedSecret;

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
						MTU: 25600
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
							postMessage({eventName: 'ui', message: padMessageRemove(message)});
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

							sendFakeMessage();
							
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
			otr.send(padMessage(e.data.message));
			break;

		/* Receive message */
		case 3:
			otr.recv(e.data.message);
			break;
	}
};
