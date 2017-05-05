import {CommonModule} from '@angular/common';
import {ErrorHandler, NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Title} from '@angular/platform-browser';
import {ChatCyphertextListComponent} from '../components/chat-cyphertext-list.component';
import {ChatCyphertextComponent} from '../components/chat-cyphertext.component';
import {ChatMainComponent} from '../components/chat-main.component';
import {ChatMessageBoxComponent} from '../components/chat-message-box.component';
import {ChatMessageListComponent} from '../components/chat-message-list.component';
import {ChatMessageComponent} from '../components/chat-message.component';
import {ContactComponent} from '../components/contact.component';
import {DialogAlertComponent} from '../components/dialog-alert.component';
import {DialogConfirmComponent} from '../components/dialog-confirm.component';
import {FileInputComponent} from '../components/file-input.component';
import {HelpComponent} from '../components/help.component';
import {MarkdownComponent} from '../components/markdown.component';
import {SignupFormComponent} from '../components/signup-form.component';
import {TranslateDirective} from '../directives/translate.directive';
import {AnalyticsService} from '../services/analytics.service';
import {ConfigService} from '../services/config.service';
import {PotassiumService} from '../services/crypto/potassium.service';
import {DatabaseService} from '../services/database.service';
import {DialogService} from '../services/dialog.service';
import {EnvService} from '../services/env.service';
import {ErrorService} from '../services/error.service';
import {FileService} from '../services/file.service';
import {NotificationService} from '../services/notification.service';
import {SignupService} from '../services/signup.service';
import {StringsService} from '../services/strings.service';
import {UtilService} from '../services/util.service';
import {VirtualKeyboardWatcherService} from '../services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../services/visibility-watcher.service';
import {CyphWebModule} from './cyph-web.module';


/**
 * Common module with shared imports for all projects.
 */
@NgModule({
	declarations: [
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatMessageListComponent,
		ContactComponent,
		DialogAlertComponent,
		DialogConfirmComponent,
		FileInputComponent,
		HelpComponent,
		MarkdownComponent,
		SignupFormComponent,
		TranslateDirective
	],
	exports: [
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatMessageListComponent,
		CommonModule,
		ContactComponent,
		DialogAlertComponent,
		DialogConfirmComponent,
		FileInputComponent,
		FormsModule,
		HelpComponent,
		MarkdownComponent,
		SignupFormComponent,
		TranslateDirective
	],
	imports: [
		CommonModule,
		CyphWebModule,
		FormsModule
	],
	providers: [
		AnalyticsService,
		ConfigService,
		DatabaseService,
		DialogService,
		EnvService,
		ErrorService,
		FileService,
		NotificationService,
		PotassiumService,
		SignupService,
		StringsService,
		Title,
		UtilService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService,
		{
			provide: ErrorHandler,
			useExisting: ErrorService
		}
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class CyphCommonModule {
	constructor () {}
}
