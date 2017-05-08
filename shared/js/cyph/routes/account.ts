/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {AccountChatComponent} from '../components/account-chat.component';
import {AccountContactsComponent} from '../components/account-contacts.component';
import {AccountFilesComponent} from '../components/account-files.component';
import {AccountHomeComponent} from '../components/account-home.component';
import {AccountLoginComponent} from '../components/account-login.component';
import {AccountLogoutComponent} from '../components/account-logout.component';
import {AccountProfileComponent} from '../components/account-profile.component';
import {AccountRegisterComponent} from '../components/account-register.component';
import {AccountSettingsComponent} from '../components/account-settings.component';
import {AccountComponent} from '../components/account.component';


/** Routing configuration for accounts UI. */
export const account: Route	= {
	path: 'account',
	component: AccountComponent,
	children: [
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
};
