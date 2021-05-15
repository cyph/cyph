if (!storage.webSignPackageTimestamp) {
	Object.keys(defaultCacheValues.localforage).forEach(function (k) {
		localforage
			.setItem(k, defaultCacheValues.localforage[k])
			.catch(function () {});
	});

	Object.keys(defaultCacheValues.localStorage).forEach(function (k) {
		storage[k] = defaultCacheValues.localStorage[k];
	});
}
