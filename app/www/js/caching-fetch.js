function fetchRetry (url, options, timeout, retries, retryDelay) {
	if (retries === undefined) {
		retries		= 5;
	}
	if (retryDelay === undefined) {
		retryDelay	= 500;
	}

	return fetchWithTimeout(url, options, timeout).catch(function (err) {
		if (retries < 1) {
			return Promise.reject(err);
		}

		return new Promise(function (resolve) {
			setTimeout(resolve, retryDelay);
		}).then(function () {
			return fetchRetry(url, options, timeout, retries - 1, retryDelay);
		});
	});
}

function fetchWithTimeout (url, options, timeout) {
	if (!timeout) {
		return fetch(url, options);
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
		fetch(url, options).then(function (o) {
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
		return localforage.ready().catch(function () {});
	}).then(function () {
		return localforage.getItem(key).catch(function () {});
	}).then(function (value) {
		if (typeof value === 'string') {
			return value;
		}

		return fetchRetry(url).then(function (response) {
			return response.text();
		}).then(function (s) {
			var value	= s.trim();
			localforage.setItem(key, value).catch(function () {});
			return value;
		});
	});
}
