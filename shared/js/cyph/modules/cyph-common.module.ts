import {CommonModule} from '@angular/common';
import {ErrorHandler, NgModule} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {BlankComponent} from '../components/blank';
import {CalendarInviteComponent} from '../components/calendar-invite';
import {CalendarInviteInheritNgFormComponent} from '../components/calendar-invite-inherit-ng-form';
import {ChatCyphertextComponent} from '../components/chat-cyphertext';
import {ChatCyphertextListComponent} from '../components/chat-cyphertext-list';
import {ChatMainComponent} from '../components/chat-main';
import {ChatMessageComponent} from '../components/chat-message';
import {ChatMessageBoxComponent} from '../components/chat-message-box';
import {ChatMessageBoxInheritNgFormComponent} from '../components/chat-message-box-inherit-ng-form';
import {ChatMessageListComponent} from '../components/chat-message-list';
import {ContactComponent} from '../components/contact';
import {DynamicFormComponent} from '../components/dynamic-form';
import {HelpComponent} from '../components/help';
import {LogoComponent} from '../components/logo';
import {PinInputComponent} from '../components/pin-input';
import {QuillComponent} from '../components/quill';
import {RedirectComponent} from '../components/redirect';
import {SearchBarComponent} from '../components/search-bar';
import {SignupFormComponent} from '../components/signup-form';
import {AnchorDirective} from '../directives/anchor.directive';
import {AutofocusDirective} from '../directives/autofocus.directive';
import {EnableLastPassDirective} from '../directives/enable-last-pass.directive';
import {RouterLinkDirective} from '../directives/router-link.directive';
import {TranslateDirective} from '../directives/translate.directive';
import {AffiliateService} from '../services/affiliate.service';
import {AnalyticsService} from '../services/analytics.service';
import {ConfigService} from '../services/config.service';
import {ErrorService} from '../services/error.service';
import {FileService} from '../services/file.service';
import {NotificationService} from '../services/notification.service';
import {SignupService} from '../services/signup.service';
import {SplitTestingService} from '../services/split-testing.service';
import {VirtualKeyboardWatcherService} from '../services/virtual-keyboard-watcher.service';
import {WindowWatcherService} from '../services/window-watcher.service';
import {CyphWebModule} from './cyph-web.module';


/**
 * Common module with shared imports for all projects.
 */
@NgModule({
	declarations: [
		AnchorDirective,
		AutofocusDirective,
		BlankComponent,
		CalendarInviteComponent,
		CalendarInviteInheritNgFormComponent,
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatMessageBoxInheritNgFormComponent,
		ChatMessageListComponent,
		ContactComponent,
		DynamicFormComponent,
		EnableLastPassDirective,
		HelpComponent,
		LogoComponent,
		PinInputComponent,
		QuillComponent,
		RedirectComponent,
		RouterLinkDirective,
		SearchBarComponent,
		SignupFormComponent,
		TranslateDirective
	],
	entryComponents: [
		BlankComponent,
		CalendarInviteComponent,
		CalendarInviteInheritNgFormComponent,
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatMessageBoxInheritNgFormComponent,
		ChatMessageListComponent,
		ContactComponent,
		DynamicFormComponent,
		HelpComponent,
		LogoComponent,
		PinInputComponent,
		QuillComponent,
		RedirectComponent,
		SearchBarComponent,
		SignupFormComponent
	],
	exports: [
		AnchorDirective,
		AutofocusDirective,
		BlankComponent,
		CalendarInviteComponent,
		CalendarInviteInheritNgFormComponent,
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatMessageBoxInheritNgFormComponent,
		ChatMessageListComponent,
		CommonModule,
		ContactComponent,
		CyphWebModule,
		DynamicFormComponent,
		EnableLastPassDirective,
		HelpComponent,
		LogoComponent,
		PinInputComponent,
		QuillComponent,
		RedirectComponent,
		RouterLinkDirective,
		SearchBarComponent,
		SignupFormComponent,
		TranslateDirective
	],
	imports: [
		CommonModule,
		CyphWebModule
	],
	providers: [
		AffiliateService,
		AnalyticsService,
		ConfigService,
		ErrorService,
		FileService,
		NotificationService,
		SignupService,
		SplitTestingService,
		Title,
		VirtualKeyboardWatcherService,
		WindowWatcherService,
		{
			provide: ErrorHandler,
			useExisting: ErrorService
		}
	]
})
export class CyphCommonModule {
	constructor () {}
}
