/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {account, accountRedirect, login, retry} from '../cyph/routes';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './components/ephemeral-chat-root';
import {LockdownComponent} from './components/lockdown';
import {TrialSignupComponent} from './components/trial-signup';


account.canActivate	= [AppService];

/** @see Routes */
export const appRoutes: Routes	= [
	retry,
	login,
	account,
	...accountRedirect,
	{path: 'trial-signup', component: TrialSignupComponent},
	{path: 'unlock/:password', component: LockdownComponent},
	{path: '**', canActivate: [AppService], component: EphemeralChatRootComponent}
];
