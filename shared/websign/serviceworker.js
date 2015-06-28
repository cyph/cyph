var files	= [
	'./',
	'websign/js/workerhelper.js',
	'websign/appcache.appcache',
	'websign/manifest.json',
	'serviceworker.js'
].map(function (file) {
	return new Request(file);
});


self.addEventListener('install', function (e) {
	try {
		caches.open('cache').then(function (cache) {
			for (var i = 0 ; i < files.length ; ++i) {
				try {
					var file	= files[i];

					fetch(file).then(function (response) {
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
	for (var i = 0 ; i < files.length ; ++i) {
		if (e.request.url === files[0].url) {
			e.respondWith(caches.match(e.request));
			return;
		}
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
