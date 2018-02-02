/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {account, accountRedirect, login, retry} from '../cyph/routes';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './components/ephemeral-chat-root';


account.canActivate	= [AppService];

/** @see Routes */
export const appRoutes: Routes	= [
	retry,
	login,
	account
].concat(
	accountRedirect
).concat(
	{path: '**', canActivate: [AppService], component: EphemeralChatRootComponent}
);
