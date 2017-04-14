/* tslint:disable:no-import-side-effect */

/**
 * @file Entry point of cyph.com.
 */


import '../preload';

import {enableProdMode} from '@angular/core';
import {platformBrowser} from '@angular/platform-browser';
import 'jquery.appear';
import 'magnific-popup';
import 'nanoscroller';
import 'rxjs/add/operator/toPromise';
import 'whatwg-fetch';
import 'zone.js';
import {config} from '../cyph/config';
import {env} from '../cyph/env';
import {util} from '../cyph/util';
import '../translations';
import {AppModule} from './app.module';


enableProdMode();
platformBrowser().bootstrapModule(AppModule);

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
