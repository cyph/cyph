/* tslint:disable:no-import-side-effect */

/**
 * @file Entry point of cyph.im.
 */


import '../preload/custombuild';

import '../preload';

import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import 'hammerjs';
import 'rxjs/add/operator/toPromise';
import 'web-animations-js';
import 'webrtc-adapter';
import 'whatwg-fetch';
import 'zone.js';
import '../translations';
import {AppModule} from './app.module';


enableProdMode();
platformBrowserDynamic().bootstrapModule(AppModule);

/* Request Persistent Storage permission to mitigate
	edge case eviction of ServiceWorker/AppCache */

try {
	(<any> navigator).storage.persist();
}
catch (_) {}
