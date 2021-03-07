/**
 * @file Entry point.
 */

import {enableProdMode} from '@angular/core';
import {platformDynamicServer} from '@angular/platform-server';
import {environment} from '../environments/environment';
import {AppModule} from './app.module';

if (environment.production) {
	enableProdMode();
}

platformDynamicServer().bootstrapModule(AppModule, {
	preserveWhitespaces: false
});
