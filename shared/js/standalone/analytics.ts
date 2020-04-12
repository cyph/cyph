/**
 * @file Initializes analytics.
 */

import {Analytics} from '../cyph/analytics';

const analytics = new Analytics();
analytics.setUID();
(<any> self).cyphAnalytics = analytics;
