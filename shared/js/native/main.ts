/* tslint:disable:no-import-side-effect no-require-imports no-var-requires */

/**
 * @file Entry point of app.
 */


import {platformNativeScriptDynamic} from 'nativescript-angular/platform';

import {enableProdMode} from '@angular/core';
import 'rxjs/add/operator/toPromise';
import {AppModule} from './app.module';
import {webCryptoPolyfill} from './js/cyph/crypto/web-crypto-polyfill';


(async (importScripts: Function = () => {}) => {
	const webViewModule: any			= require('ui/web-view');
	const webViewInterfaceModule: any	= require('nativescript-webview-interface');

	const webView			= new webViewModule.WebView();
	const webViewInterface	= new webViewInterfaceModule.WebViewInterface(webView, `
		<html><body><script>
			var seed	= crypto.getRandomValues(new Uint8Array(32));
			nsWebViewInterface.on('_', function () {
				nsWebViewInterface.emit('_', seed);
				for (var i = 0 ; i < seed.length ; ++i) {
					seed[i]	= 0;
				}
			});
		</script></body></html>
	`);

	const seed	= new Promise<Uint8Array>(resolve => { webViewInterface.on('_', resolve); });

	webViewInterface.emit('_');
	webCryptoPolyfill(await seed);
	webViewInterface.destroy();
	importScripts('/lib/js/node_modules/libsodium/dist/browsers-sumo/combined/sodium.js');

	enableProdMode();
	platformNativeScriptDynamic().bootstrapModule(AppModule);
})();
