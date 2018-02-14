var files	= [
	'/',
	'/appcache.appcache',
	'/manifest.json',
	'/serviceworker.js',
	'/unsupportedbrowser',
	'/favicon.ico',
	'/img/favicon/favicon-192x192.png',
	'/img/favicon/favicon-160x160.png',
	'/img/favicon/favicon-96x96.png',
	'/img/favicon/favicon-32x32.png',
	'/img/favicon/favicon-16x16.png',
	'/img/favicon/apple-touch-icon-180x180.png',
	'/img/favicon/apple-touch-icon-152x152.png',
	'/img/favicon/apple-touch-icon-144x144.png',
	'/img/favicon/apple-touch-icon-120x120.png',
	'/img/favicon/apple-touch-icon-114x114.png',
	'/img/favicon/apple-touch-icon-76x76.png',
	'/img/favicon/apple-touch-icon-72x72.png',
	'/img/favicon/apple-touch-icon-60x60.png',
	'/img/favicon/apple-touch-icon-57x57.png',
	'/img/favicon/mstile-144x144.png',
	'/img/logo.white.vertical.png'
].map(function (file) {
	return new Request(file);
});

var root	= files[0].url.replace(/(.*)\/$/, '$1');


self.addEventListener('install', function () {
	Promise.all([
		caches.open('cache'),
		Promise.all(files.map(function (file) {
			return fetch(file);
		}))
	]).then(function (results) {
		var cache		= results[0];
		var responses	= results[1];

		for (var i = 0 ; i < responses.length ; ++i) {
			cache.put(files[i], responses[i]);
		}
	});
});

self.addEventListener('fetch', function (e) {
	var url	= e.request.url.split('#')[0];

	/* Let requests to other origins pass through */
	if (url.indexOf(root) !== 0) {
		return;
	}

	/* Block non-whitelisted paths in this origin */
	if (
		files.filter(function (file) {
			return url === file.url;
		}).length < 1
	) {
		return e.respondWith(new Response('', {status: 404}));
	}

	return e.respondWith(
		caches.match(e.request).then(function (cachedResponse) {
			if (cachedResponse) {
				return cachedResponse;
			}

			return Promise.all([
				caches.open('cache'),
				fetch(e.request.clone())
			]).then(function (results) {
				var cache		= results[0];
				var response	= results[1];

				cache.put(e.request, response.clone());

				return response;
			});
		})
	);
});


/*** Non-WebSign-specific ***/

self.addEventListener('install', function (e) {
	e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (e) {
	e.waitUntil(self.clients.claim());
});

/* Enable running functions provided by the application */

var executedScripts	= {};

self.addEventListener('message', function (e) {
	if (
		!e.data ||
		e.data.cyphFunction !== true ||
		!e.data.name ||
		typeof e.data.scriptURL !== 'string' ||
		!e.data.scriptURL.startsWith('blob:')
	) {
		return;
	}

	new Promise(function (resolve, reject) {
		var importedFunction;

		var alreadyExecuted				= executedScripts[e.data.name];
		executedScripts[e.data.name]	= true;

		if (!alreadyExecuted) {
			importScripts(e.data.scriptURL);

			importedFunction		= self.importedFunction;
			self.importedFunction	= undefined;
		}

		if (typeof importedFunction !== 'function') {
			reject(alreadyExecuted ? {alreadyExecuted: true} : {noFunctionProvided: true});
		}
		else {
			resolve(importedFunction(e.data.input));
		}
	}).then(function (output) {
		return {id: e.data.id, output: output};
	}).catch(function (err) {
		return {err: err, id: e.data.id, rejection: true};
	}).then(function (data) {
		if (!(e.ports && e.ports.length > 0)) {
			return;
		}

		e.ports.forEach(function (port) {
			if (port) {
				port.postMessage(data);
			}
		});
	});
});

/* Make addEventListener available to functions provided by the application */

var serviceWorkerEvents			= [
	'activate',
	'controllerchange',
	'error',
	'fetch',
	'install',
	'message',
	'notificationclick',
	'push',
	'pushsubscriptionchange',
	'statechange',
	'updatefound'
];

var serviceWorkerEventHandlers	= {};

serviceWorkerEvents.forEach(function (event) {
	self.addEventListener(event, function (e) {
		var handlers	= serviceWorkerEventHandlers[event];
		if (!(handlers instanceof Array)) {
			return;
		}

		handlers.forEach(function (handler) {
			setTimeout(function () { handler(e); }, 0);
		});
	});
});

self.addEventListener	= function (event, handler) {
	if (!(serviceWorkerEventHandlers[event] instanceof Array)) {
		serviceWorkerEventHandlers[event]	= [];
	}

	serviceWorkerEventHandlers[event].push(handler);
};
