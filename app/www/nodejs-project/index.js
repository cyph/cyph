const comlink = require('comlink');
const cordova = require('cordova-bridge');
const {ipfsFetch} = require('ipfs-fetch');

const listeners = new Set();
cordova.channel.on('message', data => {
	for (const listener of listeners) {
		listener({data});
	}
});

comlink.expose(
	{
		ipfsFetch: async (hash, options) =>
			(await ipfsFetch(hash, options)).toString('base64')
	},
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
