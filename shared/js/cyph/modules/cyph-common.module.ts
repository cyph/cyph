import {NgModule} from '@angular/core';
import {BannerComponent} from '../components/banner';
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
import {HelpComponent} from '../components/help';
import {LogoComponent} from '../components/logo';
import {PinInputComponent} from '../components/pin-input';
import {QuillComponent} from '../components/quill';
import {RedirectComponent} from '../components/redirect';
import {SearchBarComponent} from '../components/search-bar';
import {SignupFormComponent} from '../components/signup-form';
import {commonModuleProviders} from '../providers/common-module';
import {CyphWebModule} from './cyph-web.module';

/**
 * Common module with shared imports for all projects.
 */
@NgModule({
	declarations: [
		BannerComponent,
		BlankComponent,
		CalendarInviteComponent,
		CalendarInviteInheritNgFormComponent,
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageBoxComponent,
		ChatMessageBoxInheritNgFormComponent,
		ChatMessageComponent,
		ChatMessageListComponent,
		ContactComponent,
		HelpComponent,
		LogoComponent,
		PinInputComponent,
		QuillComponent,
		RedirectComponent,
		SearchBarComponent,
		SignupFormComponent
	],
	exports: [
		BannerComponent,
		BlankComponent,
		CalendarInviteComponent,
		CalendarInviteInheritNgFormComponent,
		ChatCyphertextComponent,
		ChatCyphertextListComponent,
		ChatMainComponent,
		ChatMessageBoxComponent,
		ChatMessageBoxInheritNgFormComponent,
		ChatMessageComponent,
		ChatMessageListComponent,
		ContactComponent,
		CyphWebModule,
		HelpComponent,
		LogoComponent,
		PinInputComponent,
		QuillComponent,
		RedirectComponent,
		SearchBarComponent,
		SignupFormComponent
	],
	imports: [CyphWebModule],
	providers: commonModuleProviders
})
export class CyphCommonModule {
	constructor () {}
}
