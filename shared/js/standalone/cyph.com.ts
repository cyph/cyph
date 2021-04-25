/**
 * @file Exposes APIs used by cyph.com.
 * NOTE: Keep in sync with APIs exposed in ../cyph.com/app.module.
 */

import {Analytics} from '../cyph/analytics';
import {config} from '../cyph/config';
import {envDeploy} from '../cyph/env-deploy';
import {sendEmailInternal} from '../cyph/util/email/internal';
import {openWindowInternal} from '../cyph/util/window/internal';

const analytics = new Analytics();
analytics.setUID();

(<any> self).cyphAnalytics = analytics;

(<any> self).cyphConfig = config;

(<any> self).cyphEnv = envDeploy;

(<any> self).sendEmail = sendEmailInternal(
	async (o: {data?: any; method?: string; url: string}) =>
		(<any> self).jQuery.ajax(o),
	openWindowInternal
);
