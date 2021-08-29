var files	= [
	'/',
	'/appcache.appcache',
	'/manifest.json',
	'/serviceworker.js',
	'/unsupportedbrowser',
	'/favicon.ico',
	'/img/favicon/favicon-256x256.png',
	'/img/favicon/favicon-196x196.png',
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
	'/img/favicon/mask.svg',
	'/img/favicon/mstile-144x144.png',
	'/img/logo.white.vertical.png'
].map(function (file) {
	return new Request(file);
});

var urls	= files.reduce(function (o, file) { o[file.url] = true; return o; }, {});

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

	/* Redirect non-whitelisted paths in this origin */
	if (!(url in urls)) {
		return e.respondWith(Response.redirect(root + '/#' + url.slice(root.length + 1), 301));
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

self.addEventListener('install', function (e) {
	e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (e) {
	e.waitUntil(self.clients.claim());
});

/* Enable running functions provided by the application */

var storedFunctionResults	= {};
var storedFunctions			= (function () {
	var dexie = new Dexie('WebSignStoredFunctions');
	dexie.version(1).stores({data: 'key'});
	return dexie.table('data');
})();

function runStoredFunction (name) {
	return storedFunctions.get(name).then(function (o) {
		var data	= o.value;

		var importedFunction;

		if (!(data.name in storedFunctionResults)) {
			eval(data.scriptText);

			if (typeof importedFunction !== 'function') {
				return Promise.reject({noFunctionProvided: true});
			}

			storedFunctionResults[data.name]	= importedFunction(data.input);
		}

		return storedFunctionResults[data.name];
	});
}

function initStoredFunctions () {
	storedFunctions.toCollection().keys().then(function (storedFunctionList) {
		if (storedFunctionList.length < 1) {
			return;
		}

		storedFunctionList.forEach(function (name) {
			runStoredFunction(name);
		});
	});
}

initStoredFunctions();
self.addEventListener('install', initStoredFunctions);

self.addEventListener('message', function (e) {
	if (
		!e.data ||
		e.data.cyphFunction !== true ||
		!e.data.name
	) {
		return;
	}

	if (e.data.unregister === true) {
		storedFunctions.delete(e.data.name);
		return;
	}

	if (
		typeof e.data.scriptText !== 'string' ||
		!e.data.scriptText.startsWith('importedFunction = ')
	) {
		return;
	}

	storedFunctions.put({
		key: e.data.name,
		value: e.data
	}).then(function () {
		return runStoredFunction(e.data.name);
	}).then(function (output) {
		return {id: e.data.id, output: output};
	}).catch(function (err) {
		return {err: err, id: e.data.id, rejection: true};
	}).then(function (data) {
		return Promise.all([data, self.clients.matchAll()]);
	}).then(function (results) {
		var data	= results[0];
		var clients	= results[1];

		if (!(clients && clients.length > 0)) {
			return;
		}

		clients.forEach(function (client) {
			if (client) {
				client.postMessage(data);
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
			try {
				handler(e);
			}
			catch (err) {
				setTimeout(function () { throw err; }, 0);
			}
		});
	});
});

self.addEventListener	= function (event, handler) {
	if (!(serviceWorkerEventHandlers[event] instanceof Array)) {
		serviceWorkerEventHandlers[event]	= [];
	}

	serviceWorkerEventHandlers[event].push(handler);
};
