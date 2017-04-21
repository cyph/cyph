/* tslint:disable:no-import-side-effect */

/**
 * @file Entry point of cyph.im.
 */


import '../preload/custombuild';

import '../preload';

import {enableProdMode} from '@angular/core';
import {platformBrowser} from '@angular/platform-browser';
import 'hammerjs';
import 'magnific-popup';
import 'nanoscroller';
import 'rxjs/add/operator/toPromise';
import 'webrtc-adapter';
import 'whatwg-fetch';
import 'zone.js';
import '../translations';
import {AppModule} from './app.module';


enableProdMode();
platformBrowser().bootstrapModule(AppModule);

/* Request Persistent Storage permission to mitigate
	edge case eviction of ServiceWorker/AppCache */

try {
	(<any> navigator).storage.persist();
}
catch (_) {}
