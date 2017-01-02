import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule, Title} from '@angular/platform-browser';
import {UpgradeModule} from '@angular/upgrade/static';
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
import {MdSubheaderComponent} from '../cyph/components/material/md-subheader.component';
import {MdSwitchComponent} from '../cyph/components/material/md-switch.component';
import {MdTabsComponent} from '../cyph/components/material/md-tabs.component';
import {MdTextareaComponent} from '../cyph/components/material/md-textarea.component';
import {NotFoundComponent} from '../cyph/components/not-found.component';
import {SignupFormComponent} from '../cyph/components/signup-form.component';
import {NanoScrollerDirective} from '../cyph/directives/nano-scroller.directive';
import {TranslateDirective} from '../cyph/directives/translate.directive';
import {MdDialogService} from '../cyph/services/material/md-dialog.service';
import {MdToastService} from '../cyph/services/material/md-toast.service';
import {AppComponent} from './app.component';
import {BetaComponent} from './beta.component';
import {ChatRootComponent} from './chat-root.component';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
	declarations: [
		AppComponent,
		BetaComponent,
		ChatCyphertextComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		ChatRootComponent,
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
		MdDialogService,
		MdToastService,
		Title
	]
})
export class AppModule {
	/** @ignore */
	public ngDoBootstrap () : void {}

	constructor () {}
}
