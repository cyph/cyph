/**
 * @file Production entry point of app.
 */


import {platformNativeScript} from 'nativescript-angular/platform-static';

import {enableProdMode} from '@angular/core';
import {AppModuleNgFactory} from './app.module.ngfactory';


enableProdMode();
platformNativeScript().bootstrapModuleFactory(AppModuleNgFactory);
