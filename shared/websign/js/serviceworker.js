var files	= [
	'../',
	'css/loading.css',
	'js/crypto.js',
	'js/keys.js',
	'js/sha256.js',
	'js/serviceworker.js',
	'js/workerhelper.js',
	'lib/nacl.js',
	'appcache.appcache',
	'manifest.json'
];


self.addEventListener('install', function (e) {
	try {
		caches.open('cache').then(function (cache) {
			for (var i = 0 ; i < files.length ; ++i) {
				try {
					var file	= files[i];

					fetch(new Request(file)).then(function (response) {
						cache.put(file, response);
					});
				}
				catch (_) {}
			}
		});
	}
	catch (_) {}
});

self.addEventListener('fetch', function (e) {
	try {
		e.respondWith(
			caches.match(e.request).then(function (response) {
				if (response) {
					return response;
				}

				return fetch(e.request);
			})
		);
	}
	catch (_) {
		e.respondWith(fetch(e.request));
	}
});

self.addEventListener('notificationclick', function (e) {
	try {
		e.notification.close();

		e.waitUntil(clients.matchAll({
			type: 'window'
		}).then(function (clientList) {
			for (var i = 0 ; i < clientList.length ; ++i) {
				var client	= clientList[i];

				try {
					return client.focus();
				}
				catch (_) {
					try {
						return clients.openWindow(client);
					}
					catch (_) {}
				}
			}
		}));
	}
	catch (_) {}
});
