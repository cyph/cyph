/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {RedirectComponent} from '../components/redirect';


/** Routing configuration for redirecting to anything after /retry/. */
export const retry: Route	= {
	path: 'retry', children: [{path: '**', component: RedirectComponent}]
};
