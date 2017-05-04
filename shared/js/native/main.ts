/* tslint:disable:no-import-side-effect */

/**
 * @file Entry point of app.
 */


import {platformNativeScriptDynamic} from 'nativescript-angular/platform';

import {enableProdMode} from '@angular/core';
import 'rxjs/add/operator/toPromise';
import {AppModule} from './app.module';
import './js/cyph/crypto/native-web-crypto-polyfill';


enableProdMode();
platformNativeScriptDynamic().bootstrapModule(AppModule);
