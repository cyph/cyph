import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule, Title} from '@angular/platform-browser';
import {UpgradeModule} from '@angular/upgrade/static';
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
import {FileInputComponent} from '../cyph/components/file-input.component';
import {FooterComponent} from '../cyph/components/footer.component';
import {HelpComponent} from '../cyph/components/help.component';
import {LinkConnectionComponent} from '../cyph/components/link-connection.component';
import {MarkdownComponent} from '../cyph/components/markdown.component';
import {MdAutocompleteComponent} from '../cyph/components/material/md-autocomplete.component';
import {MdButtonComponent} from '../cyph/components/material/md-button.component';
import {MdCardContentComponent} from '../cyph/components/material/md-card-content.component';
import {
	MdCardHeaderTextComponent
} from '../cyph/components/material/md-card-header-text.component';
import {MdCardHeaderComponent} from '../cyph/components/material/md-card-header.component';
import {
	MdCardTitleTextComponent
} from '../cyph/components/material/md-card-title-text.component';
import {MdCardTitleComponent} from '../cyph/components/material/md-card-title.component';
import {MdCardComponent} from '../cyph/components/material/md-card.component';
import {MdContentComponent} from '../cyph/components/material/md-content.component';
import {MdFabSpeedDialComponent} from '../cyph/components/material/md-fab-speed-dial.component';
import {MdIconComponent} from '../cyph/components/material/md-icon.component';
import {MdInputComponent} from '../cyph/components/material/md-input.component';
import {MdListItemComponent} from '../cyph/components/material/md-list-item.component';
import {MdListComponent} from '../cyph/components/material/md-list.component';
import {MdMenuComponent} from '../cyph/components/material/md-menu.component';
import {
	MdProgressCircularComponent
} from '../cyph/components/material/md-progress-circular.component';
import {
	MdProgressLinearComponent
} from '../cyph/components/material/md-progress-linear.component';
import {MdSelectComponent} from '../cyph/components/material/md-select.component';
import {MdSidenavComponent} from '../cyph/components/material/md-sidenav.component';
import {MdSubheaderComponent} from '../cyph/components/material/md-subheader.component';
import {MdSwitchComponent} from '../cyph/components/material/md-switch.component';
import {MdTabsComponent} from '../cyph/components/material/md-tabs.component';
import {MdTextareaComponent} from '../cyph/components/material/md-textarea.component';
import {NotFoundComponent} from '../cyph/components/not-found.component';
import {SignupFormComponent} from '../cyph/components/signup-form.component';
import {NanoScrollerDirective} from '../cyph/directives/nano-scroller.directive';
import {TranslateDirective} from '../cyph/directives/translate.directive';
import {AccountAuthService} from '../cyph/services/account-auth.service';
import {AccountContactsService} from '../cyph/services/account-contacts.service';
import {AccountFilesService} from '../cyph/services/account-files.service';
import {AccountProfileService} from '../cyph/services/account-profile.service';
import {AccountUserLookupService} from '../cyph/services/account-user-lookup.service';
import {AccountService} from '../cyph/services/account.service';
import {ConfigService} from '../cyph/services/config.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {FileService} from '../cyph/services/file.service';
import {MdDialogService} from '../cyph/services/material/md-dialog.service';
import {MdSidenavService} from '../cyph/services/material/md-sidenav.service';
import {MdToastService} from '../cyph/services/material/md-toast.service';
import {NotificationService} from '../cyph/services/notification.service';
import {SignupService} from '../cyph/services/signup.service';
import {StringsService} from '../cyph/services/strings.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {UtilService} from '../cyph/services/util.service';
import {VirtualKeyboardWatcherService} from '../cyph/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/services/visibility-watcher.service';
import {AppComponent} from './app.component';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
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
		EphemeralChatRootComponent,
		ContactComponent,
		FileInputComponent,
		FooterComponent,
		HelpComponent,
		LinkConnectionComponent,
		MarkdownComponent,
		NanoScrollerDirective,
		NotFoundComponent,
		SignupFormComponent,
		TranslateDirective,
		MdAutocompleteComponent,
		MdButtonComponent,
		MdCardComponent,
		MdCardContentComponent,
		MdCardHeaderComponent,
		MdCardHeaderTextComponent,
		MdCardTitleComponent,
		MdCardTitleTextComponent,
		MdContentComponent,
		MdFabSpeedDialComponent,
		MdIconComponent,
		MdInputComponent,
		MdListComponent,
		MdListItemComponent,
		MdMenuComponent,
		MdProgressCircularComponent,
		MdProgressLinearComponent,
		MdSelectComponent,
		MdSidenavComponent,
		MdSubheaderComponent,
		MdSwitchComponent,
		MdTabsComponent,
		MdTextareaComponent
	],
	entryComponents: [
		AppComponent,
		FileInputComponent,
		HelpComponent
	],
	imports: [
		BrowserModule,
		CommonModule,
		FormsModule,
		UpgradeModule
	],
	providers: [
		AccountService,
		AccountAuthService,
		AccountContactsService,
		AccountFilesService,
		AccountProfileService,
		AccountUserLookupService,
		ConfigService,
		DialogService,
		EnvService,
		FaviconService,
		FileService,
		MdDialogService,
		MdSidenavService,
		MdToastService,
		NotificationService,
		SignupService,
		StringsService,
		Title,
		UrlStateService,
		UtilService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService
	]
})
export class AppModule {
	/** @ignore */
	public ngDoBootstrap () : void {}

	constructor () {}
}
