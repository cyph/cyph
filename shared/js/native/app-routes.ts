/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {AccountContactsComponent} from '../cyph/components/account-contacts.component';
import {AccountLoginComponent} from '../cyph/components/account-login.component';
import {AccountProfileComponent} from '../cyph/components/account-profile.component';
import {AccountRegisterComponent} from '../cyph/components/account-register.component';
import {AccountSettingsComponent} from '../cyph/components/account-settings.component';
import {RedirectComponent} from '../cyph/components/redirect.component';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';


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
