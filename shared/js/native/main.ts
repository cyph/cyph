/**
 * @file Entry point of app.
 */


import {platformNativeScript} from 'nativescript-angular/platform-static';

import {enableProdMode} from '@angular/core';
import {AppModule} from './app.module';


enableProdMode();
platformNativeScript().bootstrapModule(AppModule);
