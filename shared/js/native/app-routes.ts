/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {account, retry} from './js/cyph/routes';


/** @see Routes */
export const appRoutes: Routes	= [
	account,
	retry,
	{path: '**', component: EphemeralChatRootComponent}
];
