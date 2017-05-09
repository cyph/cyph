/* tslint:disable:no-import-side-effect */

/**
 * @file Entry point.
 */


import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import 'rxjs/add/operator/toPromise';
import {environment} from '../environments/environment';
import {AppModule} from './app.module';


if (environment.production) {
	enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule);


/* Request Persistent Storage permission to mitigate
	edge case eviction of ServiceWorker/AppCache */

try {
	(<any> navigator).storage.persist();
}
catch (_) {}
