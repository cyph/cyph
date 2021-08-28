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

const listeners = new Set();
cordova.channel.on('message', message => {
	for (const listener of listeners) {
		listener({data: message});
	}
});

rocksDBPromise.then(rocksDB => {
	comlink.expose(
		{
			rocksDB,
			rocksDBKeys: async () =>
				new Promise((resolve, reject) => {
					const stream = rocksDB.createKeyStream();
					const keys = [];

					stream.on('data', key => {
						keys.push(key.toString());
					});
					stream.on('end', () => {
						resolve(keys);
					});
					stream.on('error', err => {
						reject(err);
					});
				})
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
});
