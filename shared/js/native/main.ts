/* tslint:disable:no-import-side-effect */

/**
 * @file Entry point of app.
 */


import {platformNativeScriptDynamic} from 'nativescript-angular/platform';

import {enableProdMode} from '@angular/core';
import 'rxjs/add/operator/toPromise';
import {AppModule} from './app.module';


enableProdMode();
platformNativeScriptDynamic().bootstrapModule(AppModule);
