function fetchRetry (url, options, responseType, timeout, retries, retryDelay) {
	if (retries === undefined) {
		retries		= 5;
	}
	if (retryDelay === undefined) {
		retryDelay	= 500;
	}

	return fetchWithTimeout(url, options, responseType, timeout).catch(function (err) {
		if (retries < 1) {
			return Promise.reject(err);
		}

		return new Promise(function (resolve) {
			setTimeout(resolve, retryDelay);
		}).then(function () {
			return fetchRetry(url, options, responseType, timeout, retries - 1, retryDelay);
		});
	});
}

function fetchWithTimeout (url, options, responseType, timeout) {
	function fetchHandler (o) {
		if (!o.ok) {
			throw new Error('Request failure: ' + url);
		}

		return o[responseType || 'text']();
	}

	if (!timeout) {
		return fetch(url, options).then(fetchHandler);
	}

	var abortController	= typeof AbortController !== 'undefined' ?
		new AbortController() :
		undefined
	;

	if (abortController) {
		if (!options) {
			options	= {};
		}

		options.signal	= abortController.signal;
	}

	var timeoutID;

	return Promise.race([
		fetch(url, options).then(fetchHandler).then(function (o) {
			clearTimeout(timeoutID);
			return o;
		}),
		new Promise(function (_, reject) {
			timeoutID	= setTimeout(
				function () {
					reject('Request timeout exceeded.');

					if (abortController) {
						abortController.abort();
					}
				},
				timeout
			);
		})
	]);
}

function cachingFetch (url) {
	var key;

	return superSphincs.hash(url).then(function (hash) {
		key	= 'websign-fetch/' + hash.hex;

		return webSignStorage.get({key: key}).then(function (o) {
			return o.value;
		}).catch(function () {});
	}).then(function (value) {
		if (typeof value === 'string') {
			return value;
		}

		return fetchRetry(url).then(function (s) {
			var value	= s.trim();
			webSignStorage.put({key: key, value: value}).catch(function () {});
			return value;
		});
	});
}
