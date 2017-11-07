/**
 * @file Initializes analytics.
 */


import {Analytics} from '../cyph/analytics';
import {env} from '../cyph/env';


/** @see Analytics */
export const analytics	= new Analytics(env);
