/**
 * @file Entry point of app.
 */


import {platformNativeScriptDynamic} from 'nativescript-angular/platform';

import {enableProdMode} from '@angular/core';
import {AppModule} from './app.module';
import {environment} from './js/environments/environment';


if (environment.production) {
	enableProdMode();
}

platformNativeScriptDynamic().bootstrapModule(AppModule);
