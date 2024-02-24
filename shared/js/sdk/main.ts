/**
 * @file Entry point.
 */

import {enableProdMode} from '@angular/core';
import {platformServer} from '@angular/platform-server';
import {environment} from '../cyph/environment';
import {AppModule} from './app.module';

if (environment.production) {
	enableProdMode();
}

asyncImportsComplete.then(async () =>
	platformServer().bootstrapModule(AppModule, {ngZone: 'noop'})
);

/* eslint-disable-next-line import/no-default-export */
export default AppModule.sdk;
