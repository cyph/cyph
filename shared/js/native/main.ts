/* tslint:disable:no-import-side-effect no-reference */

/**
 * @file Entry point of app.
 */


/// <reference path="./js/typings/index.d.ts" />

import {platformNativeScriptDynamic} from 'nativescript-angular/platform';

import {enableProdMode} from '@angular/core';
import 'nativescript-websockets';
import 'rxjs/add/operator/toPromise';
import {AppModule} from './app.module';
import {environment} from './js/environments/environment';


if (environment.production) {
	enableProdMode();
}

platformNativeScriptDynamic().bootstrapModule(AppModule);
