var webSignStorage	= (function () {
	var dexie = new Dexie('WebSign');
	dexie.version(1).stores({data: 'key'});
	return dexie.table('data');
})();
