import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
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
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class CyphCommonModule {
	constructor () {}
}
