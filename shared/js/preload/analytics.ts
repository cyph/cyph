/**
 * @file Initializes analytics.
 */


import {AnalyticsService} from '../cyph/services/analytics.service';
import {EnvService} from '../cyph/services/env.service';


export const analytics	= new AnalyticsService(new EnvService());
