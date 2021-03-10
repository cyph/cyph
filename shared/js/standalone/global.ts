/* eslint-disable @typescript-eslint/tslint/config */

/**
 * @file Normalizes global namespace across varying runtime environments.
 */

if (typeof self === 'undefined' && typeof global !== 'undefined') {
	(<any> global).self = global;
}
else {
	(<any> self).global = self;
}

try {
	if (!self.crypto && (<any> self).msCrypto) {
		(<any> self).crypto = (<any> self).msCrypto;
	}
	if (!self.crypto.subtle && (<any> crypto).webkitSubtle) {
		(<any> self).crypto.subtle = (<any> crypto).webkitSubtle;
	}
}
catch {}

(<any> self).IS_WEB =
	typeof IS_WEB !== 'undefined' ? IS_WEB : typeof window === 'object';

for (const k of [
	'accountPrimaryTheme',
	'beforeUnloadMessage',
	'burnerRoot',
	'customBuildBase64',
	'testEnvironmentSetup',
	'translations'
]) {
	if (!(k in self)) {
		(<any> self)[k] = undefined;
	}
}

(<any> self).locationData =
	typeof locationData !== 'undefined' ?
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
		};

(<any> self).navigatorData =
	typeof navigatorData !== 'undefined' ?
		navigatorData :
	typeof navigator !== 'undefined' ?
		navigator :
		{
			appCodeName: '',
			appName: '',
			appVersion: '',
			cookieEnabled: false,
			hardwareConcurrency: 1,
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
		};

if (!IS_WEB) {
	(<any> self).saveAs = () => {
		throw new Error(
			'FileSaver is only supported in main thread of web environment.'
		);
	};
}

/* Import TypeScript helpers and fetch in Node environments */

try {
	/* eslint-disable-next-line no-eval */
	for (const [k, v] of Object.entries(eval('require')('tslib'))) {
		(<any> self)[k] = v;
	}
}
catch {}

try {
	if (typeof Blob === 'undefined') {
		/* eslint-disable-next-line no-eval */
		(<any> self).Blob = eval('require')('fetch-blob');
	}
}
catch {}

try {
	if (typeof fetch === 'undefined') {
		/* eslint-disable-next-line no-eval */
		const nodeFetch = eval('require')('node-fetch');
		(<any> self).fetch = nodeFetch;
		(<any> self).Headers = nodeFetch.Headers;
		(<any> self).Request = nodeFetch.Request;
		(<any> self).Response = nodeFetch.Response;
	}
}
catch {}

try {
	if (typeof XMLHttpRequest === 'undefined') {
		/* eslint-disable-next-line no-eval */
		const xhr2 = eval('require')('xhr2');
		(<any> self).XMLHttpRequest = xhr2;
		(<any> self).XMLHttpRequestUpload = xhr2.XMLHttpRequestUpload;
	}
}
catch {}
