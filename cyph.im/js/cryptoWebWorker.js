var otr, addressSpace, sharedSecret;

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


onmessage	= function (e) {
	switch (e.data.method) {
		/* Init */
		case 0:
			sharedSecret	= e.data.message.sharedSecret;

			if (typeof crypto == 'undefined') {
				if (typeof msCrypto != 'undefined') {
					crypto	= msCrypto;
				}
				else {
					importScripts('/lib/isaac.min.js');
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

			importScripts(
				'/lib/bower_components/otr/build/dep/bigint.js',
				'/lib/bower_components/otr/build/dep/crypto.js',
				'/lib/bower_components/otr/build/dep/eventemitter.js',
				'/lib/bower_components/otr/build/otr.min.js'
			);

			otr	= new OTR({
				fragment_size: 25600,
				send_interval: 10,
				debug: false,
				instance_tag: OTR.makeInstanceTag(),
				priv: new DSA()
			});

			otr.ALLOW_V2			= false;
			otr.ALLOW_V3			= true;
			otr.REQUIRE_ENCRYPTION	= true;

			otr.on('smp', function (type, data, act) {
				switch (type) {
					case 'question':
						otr.smpSecret(sharedSecret);
						break;

					case 'trust':
						postMessage({eventName: (data ? 'connected' : 'abort')});
						break;

					case 'abort':
						postMessage({eventName: 'abort'});
						break;
				}
			});

			otr.on('ui', function (message, wasEncrypted) {
				if (wasEncrypted) {
					postMessage({eventName: 'ui', message: padMessageRemove(message)});
				}
			});

			otr.on('io', function (message) {
				/* TODO: figure out wtf is up with these errors and if it's actually a vulnerability */
				if (message != '?OTR Error:An OTR error has occurred.') {
					postMessage({eventName: 'io', message: message});
				}
			});

			var isConnected;
			otr.on('status', function (state) {
				if (state == OTR.CONST.STATUS_AKE_SUCCESS && !isConnected) {
					isConnected	= true;
					postMessage({eventName: 'smpinit'});
				}
			});

			postMessage({eventName: 'ready'});
			break;

		/* Send query message */
		case 1:
			otr.sendQueryMsg();
			break;

		/* Send message */
		case 2:
			otr.sendMsg(padMessage(e.data.message));
			break;

		/* Receive message */
		case 3:
			otr.receiveMsg(e.data.message);
			break;

		/* SMP */
		case 4:
			otr.smpSecret(e.data.message.secret, e.data.message.question);
			break;
	}
};
