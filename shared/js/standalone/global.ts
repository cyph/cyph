/* tslint:disable:strict-type-predicates */

/**
 * @file Normalises global namespace across varying runtime environments.
 */


if (typeof self === 'undefined' && typeof global !== 'undefined') {
	(<any> global).self	= global;
}

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
	'beforeUnloadMessage',
	'customBuild',
	'customBuildApiFlags',
	'customBuildCallType',
	'customBuildFavicon',
	'customBuildPassword',
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
	typeof location !== 'undefined' ?
		location :
		{
			hash: '',
			host: '',
			hostname: '',
			href: '',
			origin: '',
			pathname: '',
			port: '',
			protocol: '',
			search: ''
		}
;

(<any> self).navigatorData	= typeof navigatorData !== 'undefined' ?
	navigatorData :
	typeof navigator !== 'undefined' ?
		navigator :
		{
			appCodeName: '',
			appName: '',
			appVersion: '',
			cookieEnabled: false,
			hardwareConcurrency: 0,
			language: '',
			maxTouchPoints: 0,
			msManipulationViewsEnabled: false,
			msMaxTouchPoints: 0,
			msPointerEnabled: false,
			onLine: true,
			platform: '',
			pointerEnabled: false,
			product: '',
			productSub: '',
			userAgent: '',
			vendor: '',
			vendorSub: '',
			webdriver: false
		}
;

if (!IS_WEB) {
	(<any> self).saveAs	= 'FileSaver is only supported in main thread of web environment.';
}


/* Make sure compiler adds necessary helpers to global scope in threads */

(async (..._) => {})(...Array.from([]));
