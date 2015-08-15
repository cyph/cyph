var files	= [
	'./',
	'websign/js/workerhelper.js',
	'websign/appcache.appcache',
	'websign/manifest.json',
	'serviceworker.js',
	'unsupportedbrowser'
].map(function (file) {
	return new Request(file);
});

var root	= files[0].url.replace(/(.*)\/$/, '$1');

function openCache (callback) {
	caches.open('cache').then(callback);
}


self.addEventListener('install', function (e) {
	try {
		openCache(function (cache) {
			files.forEach(function (file) {
				fetch(file).then(function (response) {
					cache.put(file, response);
				});
			});
		});
	}
	catch (_) {}
});

self.addEventListener('fetch', function (e) {
	for (var i = 0 ; i < files.length ; ++i) {
		if (e.request.url === files[i].url) {
			return e.respondWith(
				caches.match(e.request).then(function (response) {
					if (response) {
						return response;
					}
					else {
						return fetch(e.request.clone()).then(function (response) {
							var responseToCache	= response.clone();

							openCache(function (cache) {
								cache.put(e.request, responseToCache);
							});

							return response;
						});
					}
				})
			);
		}
	}

	/* Block non-whitelisted paths in this origin */
	if (e.request.url.indexOf(root) === 0) {
		return e.respondWith(new Response('', {status: 404}));
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
