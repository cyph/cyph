if (!storage.webSignPackageTimestamp) {
	for (const k of Object.keys(self.defaultCacheValues.localforage)) {
		localforage
			.setItem(k, defaultCacheValues.localforage[k])
			.catch(() => {});
	}

	for (const k of Object.keys(self.defaultCacheValues.localStorage)) {
		storage[k] = defaultCacheValues.localStorage[k];
	}
}
