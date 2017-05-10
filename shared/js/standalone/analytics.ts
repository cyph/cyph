/**
 * @file Initializes analytics.
 */


import {AnalyticsService} from '../cyph/services/analytics.service';
import {EnvService} from '../cyph/services/env.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';


/** @see AnalyticsService */
export const analytics	= new AnalyticsService(new EnvService(new LocalStorageService()));
