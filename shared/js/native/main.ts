/**
 * @file Entry point of app.
 */


import {platformNativeScriptDynamic} from 'nativescript-angular/platform';

import {AppModule} from './app.module';


platformNativeScriptDynamic().bootstrapModule(AppModule);
