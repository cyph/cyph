/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {AccountChatComponent} from '../components/account-chat.component';
import {AccountComposeComponent} from '../components/account-compose.component';
import {AccountContactsComponent} from '../components/account-contacts.component';
import {AccountFilesComponent} from '../components/account-files.component';
import {AccountFormComponent} from '../components/account-form.component';
import {AccountFormsComponent} from '../components/account-forms.component';
import {AccountHomeComponent} from '../components/account-home.component';
import {AccountLogoutComponent} from '../components/account-logout.component';
import {AccountNoteComponent} from '../components/account-note.component';
import {AccountNotesComponent} from '../components/account-notes.component';
import {AccountPostRegisterComponent} from '../components/account-post-register.component';
import {AccountProfileComponent} from '../components/account-profile.component';
import {AccountRegisterComponent} from '../components/account-register.component';
import {AccountSettingsComponent} from '../components/account-settings.component';
import {AccountComponent} from '../components/account.component';
import {newPatient} from '../forms';
import {ChatMessageValueTypes} from '../proto';
import {AccountAuthGuardService} from '../services/account-auth-guard.service';


/** Routing configuration for accounts UI. */
export const account: Route	= {
	path: accountRoot,
	component: AccountComponent,
	canActivate: [AccountAuthGuardService],
	canActivateChild: [AccountAuthGuardService],
	children: [
		{path: '', component: AccountHomeComponent},
		{path: 'audio/:username', component: AccountChatComponent, data: {callType: 'audio'}},
		{
			path: 'compose',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValueTypes.Quill}
		},
		{
			path: 'compose/:username',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValueTypes.Quill}
		},
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
		{path: 'logout', component: AccountLogoutComponent},
		{path: 'messages/:username', component: AccountChatComponent},
		{
			path: 'new-patient',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValueTypes.Form, value: newPatient}
		},
		{
			path: 'new-patient/:username',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValueTypes.Form, value: newPatient}
		},
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
		{path: 'register', redirectTo: 'register/1'},
		{path: 'register/:step', component: AccountRegisterComponent},
		{
			path: 'request-appointment',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValueTypes.CalendarInvite}
		},
		{
			path: 'request-appointment/:username',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValueTypes.CalendarInvite}
		},
		{path: 'settings', component: AccountSettingsComponent},
		{path: 'video/:username', component: AccountChatComponent, data: {callType: 'video'}},
		{path: 'welcome', component: AccountPostRegisterComponent},
		{path: ':username', redirectTo: 'profile/:username'}
	]
};
