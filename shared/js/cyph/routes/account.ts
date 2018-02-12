/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {AccountComponent} from '../components/account';
import {AccountAppointmentsComponent} from '../components/account-appointments';
import {AccountChatComponent} from '../components/account-chat';
import {AccountComposeComponent} from '../components/account-compose';
import {AccountContactsComponent} from '../components/account-contacts';
import {AccountFilesComponent} from '../components/account-files';
import {AccountFormComponent} from '../components/account-form';
import {AccountFormsComponent} from '../components/account-forms';
import {AccountHomeComponent} from '../components/account-home';
import {AccountLogoutComponent} from '../components/account-logout';
import {AccountNoteComponent} from '../components/account-note';
import {AccountNotesComponent} from '../components/account-notes';
import {AccountPostRegisterComponent} from '../components/account-post-register';
import {AccountProfileComponent} from '../components/account-profile';
import {AccountRegisterComponent} from '../components/account-register';
import {AccountSettingsComponent} from '../components/account-settings';
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
		{path: 'appointments', component: AccountAppointmentsComponent},
		{path: 'appointments/:appointmentID/call', component: AccountChatComponent},
		{
			path: 'appointments/:appointmentID/end',
			component: AccountChatComponent,
			data: {promptFollowup: true}
		},
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
		{path: 'messages/:username/:sessionSubID', component: AccountChatComponent},
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
		{
			path: 'request-followup/:username',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValueTypes.CalendarInvite, appointmentFollowUp: true}
		},
		{path: 'settings', component: AccountSettingsComponent},
		{path: 'video/:username', component: AccountChatComponent, data: {callType: 'video'}},
		{path: 'welcome', component: AccountPostRegisterComponent},
		{path: ':username', redirectTo: 'profile/:username'}
	]
};
