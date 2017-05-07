/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {AccountChatComponent} from '../cyph/components/account-chat.component';
import {AccountContactsComponent} from '../cyph/components/account-contacts.component';
import {AccountFilesComponent} from '../cyph/components/account-files.component';
import {AccountHomeComponent} from '../cyph/components/account-home.component';
import {AccountLoginComponent} from '../cyph/components/account-login.component';
import {AccountLogoutComponent} from '../cyph/components/account-logout.component';
import {AccountProfileComponent} from '../cyph/components/account-profile.component';
import {AccountRegisterComponent} from '../cyph/components/account-register.component';
import {AccountSettingsComponent} from '../cyph/components/account-settings.component';
import {AccountComponent} from '../cyph/components/account.component';
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
		path: 'account', component: AccountComponent, children: [
			{path: '', component: AccountHomeComponent},
			{path: 'chat', component: AccountChatComponent},
			{path: 'chat/:username', component: AccountChatComponent},
			{path: 'contacts', component: AccountContactsComponent},
			{path: 'contacts/:username', component: AccountContactsComponent},
			{path: 'files', component: AccountFilesComponent},
			{path: 'login', component: AccountLoginComponent},
			{path: 'logout', component: AccountLogoutComponent},
			{path: 'profile', component: AccountProfileComponent},
			{path: 'profile/:username', component: AccountProfileComponent},
			{path: 'register', component: AccountRegisterComponent},
			{path: 'settings', component: AccountSettingsComponent}
		]
	},
	{path: '**', component: EphemeralChatRootComponent}
];
