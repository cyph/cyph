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
import {
	AccountNotificationsSubscribeComponent
} from '../components/account-notifications-subscribe';
import {AccountPostRegisterComponent} from '../components/account-post-register';
import {AccountProfileComponent} from '../components/account-profile';
import {AccountRegisterComponent} from '../components/account-register';
import {AccountSettingsComponent} from '../components/account-settings';
import {BlankComponent} from '../components/blank';
import {newPatient} from '../forms';
import {ChatMessageValue} from '../proto';
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
		{path: 'appointments/:appointmentID/forms/:id', component: AccountFormComponent},
		{path: 'audio/:username', component: AccountChatComponent, data: {callType: 'audio'}},
		{path: 'chat-transition', component: BlankComponent},
		{
			path: 'compose',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.Quill}
		},
		{
			path: 'compose/:username',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.Quill}
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
			path: 'new-patient/:appointmentID',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.Form, value: newPatient}
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
		{
			path: 'notifications',
			component: AccountNotificationsSubscribeComponent
		},
		{
			path: 'notifications/subscribe/:email',
			component: AccountNotificationsSubscribeComponent
		},
		{
			path: 'notifications/unsubscribe',
			component: AccountNotificationsSubscribeComponent,
			data: {unsubscribe: true}
		},
		{path: 'profile', component: AccountProfileComponent},
		{path: 'profile/:username', component: AccountProfileComponent},
		{path: 'register', redirectTo: 'register/1'},
		{path: 'register/:step', component: AccountRegisterComponent},
		{
			path: 'request-appointment',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.CalendarInvite}
		},
		{
			path: 'request-appointment/:username',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.CalendarInvite}
		},
		{
			path: 'request-followup/:username',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.CalendarInvite, appointmentFollowUp: true}
		},
		{path: 'settings', component: AccountSettingsComponent},
		{path: 'video/:username', component: AccountChatComponent, data: {callType: 'video'}},
		{path: 'welcome', component: AccountPostRegisterComponent},
		{path: ':username', redirectTo: 'profile/:username'}
	]
};
