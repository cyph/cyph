import {CommonModule} from '@angular/common';
import {ErrorHandler, NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {
	MdButtonModule,
	MdCardModule,
	MdDialogModule,
	MdIconModule,
	MdInputModule,
	MdListModule,
	MdMenuModule,
	MdProgressBarModule,
	MdProgressSpinnerModule,
	MdSelectModule,
	MdSidenavModule,
	MdSliderModule,
	MdSlideToggleModule,
	MdSnackBarModule,
	MdTabsModule,
	MdToolbarModule,
	MdTooltipModule
} from '@angular/material';
import {BrowserModule, Title} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {BetaRegisterComponent} from '../cyph/components/beta-register.component';
import {ChatCyphertextComponent} from '../cyph/components/chat-cyphertext.component';
import {ChatMainComponent} from '../cyph/components/chat-main.component';
import {ChatMessageBoxComponent} from '../cyph/components/chat-message-box.component';
import {ChatMessageComponent} from '../cyph/components/chat-message.component';
import {CheckoutComponent} from '../cyph/components/checkout.component';
import {ContactComponent} from '../cyph/components/contact.component';
import {DialogAlertComponent} from '../cyph/components/dialog-alert.component';
import {DialogConfirmComponent} from '../cyph/components/dialog-confirm.component';
import {
	SmdFabSpeedDialActions,
	SmdFabSpeedDialComponent,
	SmdFabSpeedDialTrigger
} from '../cyph/components/fab-speed-dial.tmp';
import {FileInputComponent} from '../cyph/components/file-input.component';
import {HelpComponent} from '../cyph/components/help.component';
import {MarkdownComponent} from '../cyph/components/markdown.component';
import {SignupFormComponent} from '../cyph/components/signup-form.component';
import {NanoScrollerDirective} from '../cyph/directives/nano-scroller.directive';
import {TranslateDirective} from '../cyph/directives/translate.directive';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {ConfigService} from '../cyph/services/config.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {ErrorService} from '../cyph/services/error.service';
import {FileService} from '../cyph/services/file.service';
import {NotificationService} from '../cyph/services/notification.service';
import {SignupService} from '../cyph/services/signup.service';
import {StringsService} from '../cyph/services/strings.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {UtilService} from '../cyph/services/util.service';
import {VirtualKeyboardWatcherService} from '../cyph/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/services/visibility-watcher.service';
import {AppComponent} from './app.component';
import {DemoChatRootComponent} from './demo-chat-root.component';
import {DemoComponent} from './demo.component';
import {MockDatabaseService} from './mock-database.service';
import {MockPotassiumService} from './mock-potassium.service';
import {SilentNotificationService} from './silent-notification.service';


/**
 * Angular module for Cyph home page.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AppComponent,
		BetaRegisterComponent,
		ChatCyphertextComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		DemoChatRootComponent,
		DialogAlertComponent,
		DialogConfirmComponent,
		CheckoutComponent,
		ContactComponent,
		DemoComponent,
		FileInputComponent,
		HelpComponent,
		MarkdownComponent,
		NanoScrollerDirective,
		SignupFormComponent,
		TranslateDirective,
		SmdFabSpeedDialActions,
		SmdFabSpeedDialComponent,
		SmdFabSpeedDialTrigger
	],
	entryComponents: [
		BetaRegisterComponent,
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
		MdCardModule,
		MdDialogModule,
		MdIconModule,
		MdInputModule,
		MdListModule,
		MdMenuModule,
		MdProgressBarModule,
		MdProgressSpinnerModule,
		MdSelectModule,
		MdSidenavModule,
		MdSliderModule,
		MdSlideToggleModule,
		MdSnackBarModule,
		MdTabsModule,
		MdToolbarModule,
		MdTooltipModule
	],
	providers: [
		AnalyticsService,
		ConfigService,
		DialogService,
		EnvService,
		ErrorService,
		FileService,
		SignupService,
		StringsService,
		Title,
		UrlStateService,
		UtilService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService,
		{
			provide: DatabaseService,
			useClass: MockDatabaseService
		},
		{
			provide: ErrorHandler,
			useExisting: ErrorService
		},
		{
			provide: NotificationService,
			useClass: SilentNotificationService
		},
		{
			provide: PotassiumService,
			useClass: MockPotassiumService
		}
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class AppModule {
	constructor () {}
}
