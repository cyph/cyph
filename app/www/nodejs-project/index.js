const comlink = require('comlink');
const cordova = require('cordova-bridge');

const rocksDBPromise = new Promise((resolve, reject) => {
	try {
		const rocksDB = require('rocksdb')('./data.db');

		rocksDB.close(() => {
			try {
				resolve(require('levelup')(rocksDB));
			}
			catch (err) {
				reject(err);
			}
		});
	}
	catch (err) {
		reject(err);
	}
});

rocksDBPromise.then(rocksDB => {
	comlink.expose(
		{
			rocksDB
		},
		{
			addEventListener: (_TYPE, listener, _OPTIONS) => {
				cordova.channel.on('message', listener);
			},
			postMessage: (message, _TRANSFER) => {
				cordova.channel.send(message);
			}
		}
	);
});
