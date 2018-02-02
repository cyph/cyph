/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {RedirectComponent} from '../components/redirect';


/** Routing configuration for redirecting /account/* where relevant. */
export const accountRedirect: Route[]	= accountRoot === '' ?
	[{path: 'account', children: [{path: '**', component: RedirectComponent}]}] :
	[]
;
