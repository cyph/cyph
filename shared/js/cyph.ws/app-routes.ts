/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {BlankComponent} from '../cyph/components/blank';
import {account, accountRedirect, login, retry} from '../cyph/routes';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './components/ephemeral-chat-root';


account.canActivate	= [AppService];

/** @see Routes */
export const appRoutes: Routes	= [
	retry,
	login,
	account,
	accountRedirect,
	{
		path: 'extension',
		children: [{path: '**', component: BlankComponent}]
	},
	{
		path: 'telehealth',
		children: [{path: '**', component: BlankComponent}]
	},
	{path: '**', canActivate: [AppService], component: EphemeralChatRootComponent}
];
