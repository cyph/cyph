/**
 * @file Entry point of app.
 */


import {enableProdMode} from '@angular/core';
/* import {platformNativeScript} from 'nativescript-angular/platform-static'; */
import {platformNativeScriptDynamic} from 'nativescript-angular/platform';
import {AppModule} from './app.module';


enableProdMode();
/* platformNativeScript().bootstrapModule(AppModule); */
platformNativeScriptDynamic().bootstrapModule(AppModule);
