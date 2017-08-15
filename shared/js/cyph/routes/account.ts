/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {AccountChatComponent} from '../components/account-chat.component';
import {AccountContactsComponent} from '../components/account-contacts.component';
import {AccountFilesComponent} from '../components/account-files.component';
import {AccountFormComponent} from '../components/account-form.component';
import {AccountFormsComponent} from '../components/account-forms.component';
import {AccountHomeComponent} from '../components/account-home.component';
import {AccountLoginComponent} from '../components/account-login.component';
import {AccountLogoutComponent} from '../components/account-logout.component';
import {AccountNoteComponent} from '../components/account-note.component';
import {AccountNotesComponent} from '../components/account-notes.component';
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
		{path: 'docs', component: AccountNotesComponent, data: {realTime: true}},
		{
			path: 'docs/:id',
			component: AccountNoteComponent,
			data: {realTime: true},
			children: [
				{path: 'edit', component: AccountNoteComponent}
			]
		},
		{path: 'home', redirectTo: ''},
		{path: 'files', component: AccountFilesComponent},
		{path: 'forms', component: AccountFormsComponent},
		{path: 'forms/:id', component: AccountFormComponent},
		{path: 'login', component: AccountLoginComponent},
		{path: 'logout', component: AccountLogoutComponent},
		{path: 'notes', component: AccountNotesComponent, data: {realTime: false}},
		{
			path: 'notes/:id',
			component: AccountNoteComponent,
			data: {realTime: false},
			children: [
				{path: 'edit', component: AccountNoteComponent}
			]
		},
		{path: 'profile', component: AccountProfileComponent},
		{path: 'profile/:username', component: AccountProfileComponent},
		{path: 'register', component: AccountRegisterComponent},
		{path: 'settings', component: AccountSettingsComponent}
	]
};
