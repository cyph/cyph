/* eslint-disable @typescript-eslint/tslint/config */

import {Route} from '@angular/router';
import {AccountLoginComponent} from '../components/account-login';

/** Routing configuration for login. */
export const login: Route = {
	path: 'login',
	children: [{path: '**', component: AccountLoginComponent}]
};
