/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {AccountLoginComponent} from '../components/account-login';


/** Routing configuration for login. */
export const login: Route	= {
	path: `${accountRoot}${accountRoot === '' ? '' : '/'}login`,
	children: [{path: '**', component: AccountLoginComponent}]
};
