/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {AccountContactsComponent} from './js/cyph/components/account-contacts.component';
import {AccountLoginComponent} from './js/cyph/components/account-login.component';
import {AccountProfileComponent} from './js/cyph/components/account-profile.component';
import {AccountRegisterComponent} from './js/cyph/components/account-register.component';
import {AccountSettingsComponent} from './js/cyph/components/account-settings.component';
import {RedirectComponent} from './js/cyph/components/redirect.component';


/** @see Routes */
export const appRoutes: Routes	= [
	{
		path: 'retry', children: [
			{path: '**', component: RedirectComponent}
		]
	},
	{
		path: 'account', children: [
			{path: 'contacts', component: AccountContactsComponent},
			{path: 'login', component: AccountLoginComponent},
			{path: 'profile', component: AccountProfileComponent},
			{path: 'register', component: AccountRegisterComponent},
			{path: 'settings', component: AccountSettingsComponent}
		]
	},
	{path: '**', component: EphemeralChatRootComponent}
];
