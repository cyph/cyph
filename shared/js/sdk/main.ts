/**
 * @file Entry point.
 */

import {enableProdMode} from '@angular/core';
import {
	INITIAL_CONFIG as initialConfigToken,
	PlatformConfig,
	platformServer
} from '@angular/platform-server';
import {environment} from '../cyph/environment';
import {AppModule} from './app.module';

if (environment.production) {
	enableProdMode();
}

asyncImportsComplete.then(async () =>
	platformServer([
		{
			provide: initialConfigToken,
			useValue: <PlatformConfig> {
				document: '<html><body><cyph-sdk></cyph-sdk></body></html>'
			}
		}
	]).bootstrapModule(AppModule, {
		preserveWhitespaces: false
	})
);

/* eslint-disable-next-line import/no-default-export */
export default AppModule.sdk;
