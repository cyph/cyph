var files	= [
	'/',
	'/websign/css/loading.css',
	'/websign/js/cryptoinit.js',
	'/websign/js/publickeys.js',
	'/websign/js/serviceworker.js',
	'/websign/js/workerhelper.js',
	'/websign/lib/sha512.js',
	'/websign/lib/openpgp/openpgp.min.js',
	'/websign/lib/openpgp/openpgp.worker.min.js',
	'/websign/cyph.appcache',
	'/websign/manifest.json'
];


self.addEventListener('install', function (e) {
	try {
		caches.open('cache').then(function (cache) {
			for (var i = 0 ; i < files.length ; ++i) {
				try {
					var file	= files[i];
					cache.put(file, fetch(new Request(file)));
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
