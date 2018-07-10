/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {BlankComponent} from '../cyph/components/blank';
import {env} from '../cyph/env';
import {account, accountRedirect, login, retry} from '../cyph/routes';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './components/ephemeral-chat-root';
import {TrialSignupComponent} from './components/trial-signup';


account.canActivate	= [AppService];

/** @see Routes */
export const appRoutes: Routes	= [
	retry,
	login,
	account,
	...accountRedirect,
	...(!(env.environment.customBuild && env.environment.customBuild.config.lockedDown) ? [] : [
		{path: 'trial-signup', component: TrialSignupComponent},
		{path: 'unlock/:password', component: BlankComponent}
	]),
	{path: '**', canActivate: [AppService], component: EphemeralChatRootComponent}
];
