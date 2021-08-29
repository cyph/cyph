const comlink = require('comlink');
const cordova = require('cordova-bridge');

const listeners = new Set();
cordova.channel.on('message', message => {
	for (const listener of listeners) {
		listener({data: message});
	}
});

comlink.expose(
	{},
	{
		addEventListener: (_TYPE, listener, _OPTIONS) => {
			listeners.add(listener);
		},
		postMessage: (message, _TRANSFER) => {
			cordova.channel.send(message);
		},
		removeEventListener: (_TYPE, listener, _OPTIONS) => {
			listeners.delete(listener);
		}
	}
);
