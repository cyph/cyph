/* tslint:disable:object-literal-sort-keys */

import {Route} from '@angular/router';
import {AccountComponent} from '../components/account';
import {AccountAppointmentsComponent} from '../components/account-appointments';
import {AccountChatComponent} from '../components/account-chat';
import {AccountComposeComponent} from '../components/account-compose';
import {AccountContactsComponent} from '../components/account-contacts';
import {AccountEhrAccessComponent} from '../components/account-ehr-access';
import {AccountFilesComponent} from '../components/account-files';
import {AccountFormComponent} from '../components/account-form';
import {AccountFormsComponent} from '../components/account-forms';
import {AccountHomeComponent} from '../components/account-home';
import {AccountIncomingPatientInfoComponent} from '../components/account-incoming-patient-info';
import {AccountLogoutComponent} from '../components/account-logout';
import {AccountNoteComponent} from '../components/account-note';
import {AccountNotesComponent} from '../components/account-notes';
import {
	AccountNotificationsSubscribeComponent
} from '../components/account-notifications-subscribe';
import {AccountPostRegisterComponent} from '../components/account-post-register';
import {AccountProfileComponent} from '../components/account-profile';
import {
	AccountPseudoRelationshipResponseComponent
} from '../components/account-pseudo-relationship-response';
import {AccountRegisterComponent} from '../components/account-register';
import {AccountSettingsComponent} from '../components/account-settings';
import {AccountWalletsComponent} from '../components/account-wallets';
import {BlankComponent} from '../components/blank';
import {NotFoundComponent} from '../components/not-found';
import {UploadEhrCredentialsComponent} from '../components/upload-ehr-credentials';
import {env} from '../env';
import {newPatient} from '../forms';
import {AccountUserTypes, ChatMessageValue} from '../proto';
import {AccountAuthGuardService} from '../services/account-auth-guard.service';


/** Routing configuration for accounts UI. */
export const account: Route	= {
	path: accountRoot,
	component: AccountComponent,
	canActivate: [AccountAuthGuardService],
	canActivateChild: [AccountAuthGuardService],
	children: [
		{
			path: '',
			component: AccountHomeComponent,
			children: [
				{path: 'search', component: BlankComponent}
			]
		},
		{path: '404', component: NotFoundComponent},
		{
			path: 'anonymous-chat',
			component: AccountChatComponent,
			data: {generateAnonymousChannelID: true}
		},
		{
			path: 'accept/:id',
			component: AccountPseudoRelationshipResponseComponent,
			data: {accept: true}
		},
		{path: 'appointments', component: AccountAppointmentsComponent},
		{
			path: 'appointments/:appointmentID',
			component: AccountChatComponent,
			children: [
				{
					path: 'call',
					component: BlankComponent,
					data: {
						ephemeralSubSession: true,
						messageType: ChatMessageValue.Types.Form,
						value: newPatient
					}
				},
				{
					path: 'end',
					component: BlankComponent,
					data: {
						ephemeralSubSession: true,
						promptFollowup: true
					}
				}
			]
		},
		{path: 'appointments/:appointmentID/forms/:id', component: AccountFormComponent},
		{
			path: 'audio/:contactID',
			component: AccountChatComponent,
			data: {callType: 'audio'}
		},
		{
			path: 'audio/:contactID/:sessionSubID',
			component: AccountChatComponent,
			data: {
				callType: 'audio',
				ephemeralSubSession: true
			}
		},
		{
			path: 'audio/:contactID/:sessionSubID/:answerExpireTime',
			component: AccountChatComponent,
			data: {
				callType: 'audio',
				ephemeralSubSession: true
			}
		},
		{
			path: 'call/:contactID',
			component: AccountChatComponent,
			data: {callType: 'audio'}
		},
		{
			path: 'call/:contactID/:sessionSubID',
			component: AccountChatComponent,
			data: {
				callType: 'audio',
				cancelRedirectsHome: true,
				ephemeralSubSession: true
			}
		},
		{
			path: 'call/:contactID/:sessionSubID/:answerExpireTime',
			component: AccountChatComponent,
			data: {
				callType: 'audio',
				cancelRedirectsHome: true,
				ephemeralSubSession: true
			}
		},
		{path: 'chat-transition', component: BlankComponent},
		{
			path: 'compose',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.Quill}
		},
		{
			path: 'compose/:contactID',
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
				{path: 'edit', component: BlankComponent}
			]
		},
		{
			path: 'doctors',
			component:
				(
					env.isTelehealth &&
					env.environment.customBuild &&
					env.environment.customBuild.config.organization
				) ?
					AccountProfileComponent :
					AccountContactsComponent
			,
			data: {doctorListOnly: true}
		},
		{path: 'ehr-access', component: AccountEhrAccessComponent},
		{path: 'files', component: AccountFilesComponent},
		{path: 'forms', component: AccountFormsComponent},
		{path: 'forms/:id', component: AccountFormComponent},
		{path: 'home', redirectTo: ''},
		{path: 'incoming-patient-info', component: AccountIncomingPatientInfoComponent},
		{path: 'logout', component: AccountLogoutComponent},
		{
			path: 'mail/:contactID',
			component: AccountChatComponent,
			data: {defaultSessionSubID: 'mail'}
		},
		{path: 'messages', component: AccountContactsComponent},
		{
			path: 'messages/ephemeral/:contactID/:sessionSubID',
			component: AccountChatComponent,
			data: {ephemeralSubSession: true}
		},
		{path: 'messages/user/:username', component: AccountChatComponent},
		{path: 'messages/:contactID', component: AccountChatComponent},
		{path: 'messages/:contactID/:sessionSubID', component: AccountChatComponent},
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
				{path: 'edit', component: BlankComponent}
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
		{
			path: 'patients',
			component: AccountContactsComponent,
			data: {userTypeFilter: AccountUserTypes.Standard}
		},
		{
			path: 'profile',
			component: AccountProfileComponent,
			children: [
				{path: 'edit', component: BlankComponent}
			]
		},
		{path: 'profile/:username', component: AccountProfileComponent},
		{path: 'register', redirectTo: 'register/1'},
		{path: 'register/:step', component: AccountRegisterComponent},
		{
			path: 'reject/:id',
			component: AccountPseudoRelationshipResponseComponent,
			data: {accept: false}
		},
		{
			path: 'request-appointment',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.CalendarInvite}
		},
		{
			path: 'request-appointment/:contactID',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.CalendarInvite}
		},
		{
			path: 'request-followup/:contactID',
			component: AccountComposeComponent,
			data: {messageType: ChatMessageValue.Types.CalendarInvite, appointmentFollowUp: true}
		},
		{
			path: 'settings',
			children: [
				{path: '', component: AccountSettingsComponent, data: {state: 1}},
				{path: 'lock-screen', component: AccountSettingsComponent, data: {state: 3}},
				{path: 'master-key', component: AccountSettingsComponent, data: {state: 2}}
			]
		},
		{
			path: 'staff',
			component: AccountContactsComponent,
			data: {userTypeFilter: AccountUserTypes.TelehealthAdmin}
		},
		{
			path: 'upload-ehr-credentials/:cyphAdminKey/:redoxApiKey/:redoxSecret/:username',
			component: UploadEhrCredentialsComponent
		},
		{
			path: 'video/:contactID',
			component: AccountChatComponent,
			data: {callType: 'video'}
		},
		{
			path: 'video/:contactID/:sessionSubID',
			component: AccountChatComponent,
			data: {
				callType: 'video',
				ephemeralSubSession: true
			}
		},
		{
			path: 'video/:contactID/:sessionSubID/:answerExpireTime',
			component: AccountChatComponent,
			data: {
				callType: 'video',
				ephemeralSubSession: true
			}
		},
		{path: 'wallets', component: AccountWalletsComponent},
		{path: 'welcome', component: AccountPostRegisterComponent},
		{path: ':username', redirectTo: 'profile/:username'},
		{path: '**', redirectTo: '404'}
	]
};
