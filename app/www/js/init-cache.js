if (!storage.webSignPackageTimestamp) {
	if (self.defaultCacheValues.webSignStorage.length > 0) {
		webSignStorage
			.bulkPut(self.defaultCacheValues.webSignStorage)
			.catch(() => {});
	}

	for (const k of Object.keys(self.defaultCacheValues.localStorage)) {
		storage[k] = defaultCacheValues.localStorage[k];
	}
}
