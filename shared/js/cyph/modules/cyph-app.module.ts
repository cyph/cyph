import {NgModule} from '@angular/core';
import {AccountChatComponent} from '../components/account-chat.component';
import {AccountContactsComponent} from '../components/account-contacts.component';
import {AccountFilesComponent} from '../components/account-files.component';
import {AccountFormComponent} from '../components/account-form.component';
import {AccountFormsComponent} from '../components/account-forms.component';
import {AccountHomeComponent} from '../components/account-home.component';
import {AccountLoginComponent} from '../components/account-login.component';
import {AccountLogoutComponent} from '../components/account-logout.component';
import {AccountMenuComponent} from '../components/account-menu.component';
import {AccountNoteComponent} from '../components/account-note.component';
import {AccountNotesComponent} from '../components/account-notes.component';
import {AccountProfileComponent} from '../components/account-profile.component';
import {AccountRegisterComponent} from '../components/account-register.component';
import {AccountSettingsComponent} from '../components/account-settings.component';
import {AccountComponent} from '../components/account.component';
import {FooterComponent} from '../components/footer.component';
import {LinkConnectionComponent} from '../components/link-connection.component';
import {NotFoundComponent} from '../components/not-found.component';
import {QuillComponent} from '../components/quill.component';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
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
		AccountChatComponent,
		AccountComponent,
		AccountContactsComponent,
		AccountFilesComponent,
		AccountFormComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent,
		QuillComponent
	],
	exports: [
		AccountChatComponent,
		AccountComponent,
		AccountContactsComponent,
		AccountFilesComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent,
		QuillComponent
	],
	imports: [
		CyphCommonModule,
		CyphWebModule
	],
	providers: [
		AccountAuthService,
		AccountContactsService,
		AccountDatabaseService,
		AccountFilesService,
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
