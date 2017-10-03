/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {AccountComponent} from '../cyph/components/account.component';
import {account, retry} from '../cyph/routes';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';


account.canActivate	= [AppService];

/** @see Routes */
export const appRoutes: Routes	= [
	retry,
	account,
	{
		path: 'extension',
		children: [{path: '**', component: AccountComponent}]
	},
	{
		path: 'telehealth',
		children: [{path: '**', component: AccountComponent}]
	},
	{path: '**', canActivate: [AppService], component: EphemeralChatRootComponent}
];
