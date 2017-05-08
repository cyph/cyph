/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {account, retry} from '../cyph/routes';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';


/** @see Routes */
export const appRoutes: Routes	= [
	account,
	retry,
	{path: '**', component: EphemeralChatRootComponent}
];
