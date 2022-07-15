/**
 * @file Entry point.
 */

import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {environment} from '../cyph/environment';
import {AppModule} from './app.module';

if (environment.production) {
	enableProdMode();
}
else if ((<any> module).hot) {
	(<any> module).hot.accept();
}

asyncImportsComplete.then(async () =>
	platformBrowserDynamic().bootstrapModule(AppModule, {
		preserveWhitespaces: false
	})
);
