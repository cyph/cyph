/* tslint:disable:no-import-side-effect reference-only */

/**
 * @file Entry point of app.
 */


/// <reference path="../typings/index.d.ts" />

import {platformNativeScriptDynamic} from 'nativescript-angular/platform';

import {enableProdMode} from '@angular/core';
import 'nativescript-websockets';
import 'rxjs/add/operator/toPromise';
import {AppModule} from './app.module';


enableProdMode();
platformNativeScriptDynamic().bootstrapModule(AppModule);
