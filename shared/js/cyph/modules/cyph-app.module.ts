import {NgModule} from '@angular/core';
import {AccountComponent} from '../components/account';
import {AccountAppointmentsComponent} from '../components/account-appointments';
import {AccountCallWaitingComponent} from '../components/account-call-waiting';
import {AccountChatComponent} from '../components/account-chat';
import {AccountChatMessageBoxComponent} from '../components/account-chat-message-box';
import {AccountComposeComponent} from '../components/account-compose';
import {AccountContactComponent} from '../components/account-contact';
import {AccountContactsComponent} from '../components/account-contacts';
import {AccountContactsSearchComponent} from '../components/account-contacts-search';
import {AccountFileSharingComponent} from '../components/account-file-sharing';
import {AccountFilesComponent} from '../components/account-files';
import {AccountFormComponent} from '../components/account-form';
import {AccountFormsComponent} from '../components/account-forms';
import {AccountHomeComponent} from '../components/account-home';
import {AccountLoginComponent} from '../components/account-login';
import {AccountLogoutComponent} from '../components/account-logout';
import {AccountMenuComponent} from '../components/account-menu';
import {AccountNoteComponent} from '../components/account-note';
import {AccountNotesComponent} from '../components/account-notes';
import {AccountPostRegisterComponent} from '../components/account-post-register';
import {AccountProfileComponent} from '../components/account-profile';
import {AccountRegisterComponent} from '../components/account-register';
import {AccountSettingsComponent} from '../components/account-settings';
import {AccountUserRatingComponent} from '../components/account-user-rating';
import {FooterComponent} from '../components/footer';
import {LinkConnectionComponent} from '../components/link-connection';
import {NotFoundComponent} from '../components/not-found';
import {AccountAuthGuardService} from '../services/account-auth-guard.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountOrganizationsService} from '../services/account-organizations.service';
import {AccountSettingsService} from '../services/account-settings.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {DatabaseService} from '../services/database.service';
import {DOMPurifyHtmlSanitizerService} from '../services/dompurify-html-sanitizer.service';
import {FirebaseDatabaseService} from '../services/firebase-database.service';
import {HtmlSanitizerService} from '../services/html-sanitizer.service';
import {CyphCommonModule} from './cyph-common.module';
import {CyphWebModule} from './cyph-web.module';


/**
 * Common module with shared imports for application projects.
 */
@NgModule({
	declarations: [
		AccountAppointmentsComponent,
		AccountCallWaitingComponent,
		AccountChatComponent,
		AccountChatMessageBoxComponent,
		AccountComponent,
		AccountComposeComponent,
		AccountContactComponent,
		AccountContactsComponent,
		AccountContactsSearchComponent,
		AccountFilesComponent,
		AccountFileSharingComponent,
		AccountFormComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountPostRegisterComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		AccountUserRatingComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent
	],
	entryComponents: [
		AccountAppointmentsComponent,
		AccountCallWaitingComponent,
		AccountChatComponent,
		AccountChatMessageBoxComponent,
		AccountComponent,
		AccountComposeComponent,
		AccountContactComponent,
		AccountContactsComponent,
		AccountContactsSearchComponent,
		AccountFilesComponent,
		AccountFileSharingComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountPostRegisterComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent
	],
	exports: [
		AccountAppointmentsComponent,
		AccountCallWaitingComponent,
		AccountChatComponent,
		AccountChatMessageBoxComponent,
		AccountComponent,
		AccountComposeComponent,
		AccountContactComponent,
		AccountContactsComponent,
		AccountContactsSearchComponent,
		AccountFilesComponent,
		AccountFileSharingComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountPostRegisterComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent
	],
	imports: [
		CyphCommonModule,
		CyphWebModule
	],
	providers: [
		AccountAuthGuardService,
		AccountAuthService,
		AccountContactsService,
		AccountDatabaseService,
		AccountFilesService,
		AccountOrganizationsService,
		AccountService,
		AccountSettingsService,
		AccountUserLookupService,
		{
			provide: DatabaseService,
			useClass: FirebaseDatabaseService
		},
		{
			provide: HtmlSanitizerService,
			useClass: DOMPurifyHtmlSanitizerService
		}
	]
})
export class CyphAppModule {
	constructor () {}
}
