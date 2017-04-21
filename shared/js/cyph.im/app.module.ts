import {CommonModule} from '@angular/common';
import {ErrorHandler, NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {
	MdButtonModule,
	MdButtonToggleModule,
	MdCardModule,
	MdDialogModule,
	MdIconModule,
	MdInputModule,
	MdListModule,
	MdMenuModule,
	MdProgressBarModule,
	MdProgressSpinnerModule,
	MdSelectModule,
	MdSlideToggleModule,
	MdSnackBarModule,
	MdTabsModule,
	MdTooltipModule
} from '@angular/material';
import {BrowserModule, Title} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AccountChatComponent} from '../cyph/components/account-chat.component';
import {AccountContactsComponent} from '../cyph/components/account-contacts.component';
import {AccountFilesComponent} from '../cyph/components/account-files.component';
import {AccountHomeComponent} from '../cyph/components/account-home.component';
import {AccountLoginComponent} from '../cyph/components/account-login.component';
import {AccountLogoutComponent} from '../cyph/components/account-logout.component';
import {AccountMenuComponent} from '../cyph/components/account-menu.component';
import {AccountProfileComponent} from '../cyph/components/account-profile.component';
import {AccountRegisterComponent} from '../cyph/components/account-register.component';
import {AccountSettingsComponent} from '../cyph/components/account-settings.component';
import {AccountComponent} from '../cyph/components/account.component';
import {ChatCyphertextComponent} from '../cyph/components/chat-cyphertext.component';
import {ChatMainComponent} from '../cyph/components/chat-main.component';
import {ChatMessageBoxComponent} from '../cyph/components/chat-message-box.component';
import {ChatMessageComponent} from '../cyph/components/chat-message.component';
import {ContactComponent} from '../cyph/components/contact.component';
import {DialogAlertComponent} from '../cyph/components/dialog-alert.component';
import {DialogConfirmComponent} from '../cyph/components/dialog-confirm.component';
import {
	SmdFabSpeedDialActions,
	SmdFabSpeedDialComponent,
	SmdFabSpeedDialTrigger
} from '../cyph/components/fab-speed-dial.tmp';
import {FileInputComponent} from '../cyph/components/file-input.component';
import {FooterComponent} from '../cyph/components/footer.component';
import {HelpComponent} from '../cyph/components/help.component';
import {LinkConnectionComponent} from '../cyph/components/link-connection.component';
import {MarkdownComponent} from '../cyph/components/markdown.component';
import {NotFoundComponent} from '../cyph/components/not-found.component';
import {SignupFormComponent} from '../cyph/components/signup-form.component';
import {NanoScrollerDirective} from '../cyph/directives/nano-scroller.directive';
import {TranslateDirective} from '../cyph/directives/translate.directive';
import {AccountAuthService} from '../cyph/services/account-auth.service';
import {AccountContactsService} from '../cyph/services/account-contacts.service';
import {AccountFilesService} from '../cyph/services/account-files.service';
import {AccountSettingsService} from '../cyph/services/account-settings.service';
import {AccountUserLookupService} from '../cyph/services/account-user-lookup.service';
import {AccountService} from '../cyph/services/account.service';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {ConfigService} from '../cyph/services/config.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {ThreadedPotassiumService} from '../cyph/services/crypto/threaded-potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {ErrorService} from '../cyph/services/error.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {FileService} from '../cyph/services/file.service';
import {FirebaseDatabaseService} from '../cyph/services/firebase-database.service';
import {NotificationService} from '../cyph/services/notification.service';
import {SignupService} from '../cyph/services/signup.service';
import {StringsService} from '../cyph/services/strings.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {UtilService} from '../cyph/services/util.service';
import {VirtualKeyboardWatcherService} from '../cyph/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/services/visibility-watcher.service';
import {AppComponent} from './app.component';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {LockdownComponent} from './lockdown.component';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AccountChatComponent,
		AccountComponent,
		AccountContactsComponent,
		AccountFilesComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		AppComponent,
		ChatCyphertextComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		DialogAlertComponent,
		DialogConfirmComponent,
		EphemeralChatRootComponent,
		ContactComponent,
		FileInputComponent,
		FooterComponent,
		HelpComponent,
		LinkConnectionComponent,
		LockdownComponent,
		MarkdownComponent,
		NanoScrollerDirective,
		NotFoundComponent,
		SignupFormComponent,
		TranslateDirective,
		SmdFabSpeedDialActions,
		SmdFabSpeedDialComponent,
		SmdFabSpeedDialTrigger
	],
	entryComponents: [
		DialogAlertComponent,
		DialogConfirmComponent,
		HelpComponent
	],
	imports: [
		BrowserAnimationsModule,
		BrowserModule,
		CommonModule,
		FlexLayoutModule,
		FormsModule,
		MdButtonModule,
		MdButtonToggleModule,
		MdCardModule,
		MdDialogModule,
		MdIconModule,
		MdInputModule,
		MdListModule,
		MdMenuModule,
		MdProgressBarModule,
		MdProgressSpinnerModule,
		MdSelectModule,
		MdSlideToggleModule,
		MdSnackBarModule,
		MdTabsModule,
		MdTooltipModule
	],
	providers: [
		AccountService,
		AccountAuthService,
		AccountContactsService,
		AccountFilesService,
		AccountSettingsService,
		AccountUserLookupService,
		AnalyticsService,
		ConfigService,
		DialogService,
		EnvService,
		ErrorService,
		FaviconService,
		FileService,
		NotificationService,
		SignupService,
		StringsService,
		Title,
		UrlStateService,
		UtilService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService,
		{
			provide: DatabaseService,
			useClass: FirebaseDatabaseService
		},
		{
			provide: ErrorHandler,
			useExisting: ErrorService
		},
		{
			provide: PotassiumService,
			useClass: ThreadedPotassiumService
		}
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class AppModule {
	constructor () {}
}
