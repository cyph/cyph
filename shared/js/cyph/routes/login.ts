/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {AccountLoginComponent} from '../components/account-login.component';


/** Routing configuration for login. */
export const login: Route	= {
	path: 'login',
	children: [{path: '**', component: AccountLoginComponent}]
};
