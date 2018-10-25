/**
 * @file Entry point.
 */


import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {environment} from '../environments/environment';
import {AppModule} from './app.module';


if (environment.production) {
	enableProdMode();
}
else if ((<any> module).hot) {
	(<any> module).hot.accept();
}

platformBrowserDynamic().bootstrapModule(AppModule, {preserveWhitespaces: false});
