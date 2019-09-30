importScripts('lib/localforage.js');


self.addEventListener('install', function (e) {
	e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (e) {
	e.waitUntil(self.clients.claim());
});

/* Enable running functions provided by the application */

var storedFunctionResults	= {};
var storedFunctionRoot		= 'websign-stored-functions';

function runStoredFunction (name) {
	return localforage.getItem(storedFunctionRoot + '/' + name).then(function (data) {
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
	localforage.getItem(storedFunctionRoot).then(function (storedFunctionList) {
		if (!storedFunctionList) {
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

	var storedFunctionKey = storedFunctionRoot + '/' + e.data.name;

	if (e.data.unregister === true) {
		localforage.removeItem(storedFunctionKey);
		return;
	}

	if (
		typeof e.data.scriptText !== 'string' ||
		!e.data.scriptText.startsWith('importedFunction = ')
	) {
		return;
	}

	localforage.setItem(
		storedFunctionKey,
		e.data
	).then(function () {
		return localforage.getItem(storedFunctionRoot);
	}).then(function (storedFunctionList) {
		if (!storedFunctionList) {
			storedFunctionList	= [];
		}

		if (storedFunctionList.indexOf(e.data.name) > -1) {
			return;
		}

		return localforage.setItem(
			storedFunctionRoot,
			storedFunctionList.concat(e.data.name)
		);
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
