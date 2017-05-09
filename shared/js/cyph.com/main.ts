/* tslint:disable:no-import-side-effect */

/**
 * @file Entry point.
 */


import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import 'rxjs/add/operator/toPromise';
import {config} from '../cyph/config';
import {env} from '../cyph/env';
import {util} from '../cyph/util';
import {environment} from '../environments/environment';
import {AppModule} from './app.module';


if (environment.production) {
	enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule);


/* Redirect to Onion site when on Tor */

if (!env.isOnion) {
	(async () => {
		const response: string	= await util.request({
			url: `https://ping.${config.onionRoot}`
		}).catch(
			() => ''
		);

		if (response === 'pong') {
			locationData.href	=
				`https://${config.onionRoot}/` +
				locationData.href.split(locationData.host + '/')[1]
			;
		}
	})();
}
