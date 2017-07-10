function cachingFetch (url) {
	var key;

	return superSphincs.hash(url).then(function (hash) {
		key	= 'websign-fetch/' + hash.hex;
		return localforage.ready();
	}).then(function () {
		return localforage.getItem(key).catch(function () {});
	}).then(function (value) {
		if (typeof value === 'string') {
			return value;
		}

		return fetch(url).then(function (response) {
			return response.text();
		}).then(function (s) {
			var value	= s.trim();
			localforage.setItem(key, value).catch(function () {});
			return value;
		});
	});
}
