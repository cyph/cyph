/**
 * @file Initializes analytics.
 */


import {AnalyticsService} from '../cyph/services/analytics.service';
import {EnvService} from '../cyph/services/env.service';
import {WebLocalStorageService} from '../cyph/services/web-local-storage.service';


/** @see AnalyticsService */
export const analytics	= new AnalyticsService(new EnvService(new WebLocalStorageService()));
