/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {BlankComponent} from '../cyph/components/blank.component';
import {account, login, retry} from '../cyph/routes';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';


account.canActivate	= [AppService];

/** @see Routes */
export const appRoutes: Routes	= [
	retry,
	login,
	account,
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
