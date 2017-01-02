/**
 * @file Normalises global namespace across varying runtime environments.
 */


try {
	if (!self.crypto && (<any> self).msCrypto) {
		(<any> self).crypto			= (<any> self).msCrypto;
	}
	if (!self.crypto.subtle && (<any> crypto).webkitSubtle) {
		(<any> self).crypto.subtle	= (<any> crypto).webkitSubtle;
	}
}
catch (_) {}

(<any> self).IS_WEB	= typeof IS_WEB !== 'undefined' ?
	IS_WEB :
	typeof window === 'object'
;

for (const k of ['window', 'document']) {
	if (!(k in self)) {
		(<any> self)[k]	= self;
	}
}

for (const k of [
	'Audio',
	'customBuild',
	'customBuildFavicon',
	'history',
	'location',
	'navigator',
	'onthreadmessage',
	'translations'
]) {
	if (!(k in self)) {
		(<any> self)[k]	= undefined;
	}
}

(<any> self).locationData	= typeof locationData !== 'undefined' ?
	locationData :
	location
;

(<any> self).navigatorData	= typeof navigatorData !== 'undefined' ?
	navigatorData :
	navigator
;


/* Make sure compiler adds necessary helpers to global scope in threads */

(async (..._) => {})(...Array.from([]));
