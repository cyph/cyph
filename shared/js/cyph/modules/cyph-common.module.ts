import {CommonModule} from '@angular/common';
import {ErrorHandler, NgModule} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {BlankComponent} from '../components/blank.component';
import {ChatComposeComponent} from '../components/chat-compose.component';
import {ChatCyphertextListComponent} from '../components/chat-cyphertext-list.component';
import {ChatCyphertextComponent} from '../components/chat-cyphertext.component';
import {ChatMainComponent} from '../components/chat-main.component';
import {ChatMessageBoxComponent} from '../components/chat-message-box.component';
import {ChatMessageListComponent} from '../components/chat-message-list.component';
import {ChatMessageComponent} from '../components/chat-message.component';
import {ContactComponent} from '../components/contact.component';
import {DynamicFormComponent} from '../components/dynamic-form.component';
import {FileInputComponent} from '../components/file-input.component';
import {HelpComponent} from '../components/help.component';
import {MarkdownComponent} from '../components/markdown.component';
import {PinInputComponent} from '../components/pin-input.component';
import {RedirectComponent} from '../components/redirect.component';
import {SignupFormComponent} from '../components/signup-form.component';
import {RouterLinkDirective} from '../directives/router-link.directive';
import {TranslateDirective} from '../directives/translate.directive';
import {AnalyticsService} from '../services/analytics.service';
import {ChatMessageGeometryService} from '../services/chat-message-geometry.service';
import {ConfigService} from '../services/config.service';
import {EnvService} from '../services/env.service';
import {ErrorService} from '../services/error.service';
import {FileService} from '../services/file.service';
import {NotificationService} from '../services/notification.service';
import {SignupService} from '../services/signup.service';
import {SplitTestingService} from '../services/split-testing.service';
import {StringsService} from '../services/strings.service';
import {VirtualKeyboardWatcherService} from '../services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../services/visibility-watcher.service';
import {CyphWebModule} from './cyph-web.module';


/**
 * Common module with shared imports for all projects.
 */
@NgModule({
	declarations: [
		BlankComponent,
		ChatComposeComponent,
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatMessageListComponent,
		ContactComponent,
		DynamicFormComponent,
		FileInputComponent,
		HelpComponent,
		MarkdownComponent,
		PinInputComponent,
		RedirectComponent,
		RouterLinkDirective,
		SignupFormComponent,
		TranslateDirective
	],
	entryComponents: [
		HelpComponent
	],
	exports: [
		BlankComponent,
		ChatComposeComponent,
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatMessageListComponent,
		CommonModule,
		ContactComponent,
		DynamicFormComponent,
		FileInputComponent,
		HelpComponent,
		MarkdownComponent,
		PinInputComponent,
		RedirectComponent,
		RouterLinkDirective,
		SignupFormComponent,
		TranslateDirective
	],
	imports: [
		CommonModule,
		CyphWebModule
	],
	providers: [
		AnalyticsService,
		ChatMessageGeometryService,
		ConfigService,
		EnvService,
		ErrorService,
		FileService,
		NotificationService,
		SignupService,
		SplitTestingService,
		StringsService,
		Title,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService,
		{
			provide: ErrorHandler,
			useExisting: ErrorService
		}
	]
})
export class CyphCommonModule {
	constructor () {}
}
