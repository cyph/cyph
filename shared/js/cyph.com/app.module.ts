import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeModule} from '@angular/upgrade/static';
import {ChatCyphertextComponent} from '../cyph/ui/components/chat-cyphertext.component';
import {ChatMainComponent} from '../cyph/ui/components/chat-main.component';
import {ChatMessageBoxComponent} from '../cyph/ui/components/chat-message-box.component';
import {ChatMessageComponent} from '../cyph/ui/components/chat-message.component';
import {CheckoutComponent} from '../cyph/ui/components/checkout.component';
import {ContactComponent} from '../cyph/ui/components/contact.component';
import {FileInputComponent} from '../cyph/ui/components/file-input.component';
import {HelpComponent} from '../cyph/ui/components/help.component';
import {MarkdownComponent} from '../cyph/ui/components/markdown.component';
import {MdButtonComponent} from '../cyph/ui/components/material/md-button.component';
import {MdCardContentComponent} from '../cyph/ui/components/material/md-card-content.component';
import {
	MdCardHeaderTextComponent
} from '../cyph/ui/components/material/md-card-header-text.component';
import {MdCardHeaderComponent} from '../cyph/ui/components/material/md-card-header.component';
import {
	MdCardTitleTextComponent
} from '../cyph/ui/components/material/md-card-title-text.component';
import {MdCardTitleComponent} from '../cyph/ui/components/material/md-card-title.component';
import {MdCardComponent} from '../cyph/ui/components/material/md-card.component';
import {MdContentComponent} from '../cyph/ui/components/material/md-content.component';
import {MdFabSpeedDialComponent} from '../cyph/ui/components/material/md-fab-speed-dial.component';
import {MdIconComponent} from '../cyph/ui/components/material/md-icon.component';
import {MdInputComponent} from '../cyph/ui/components/material/md-input.component';
import {MdListItemComponent} from '../cyph/ui/components/material/md-list-item.component';
import {MdListComponent} from '../cyph/ui/components/material/md-list.component';
import {MdMenuComponent} from '../cyph/ui/components/material/md-menu.component';
import {
	MdProgressCircularComponent
} from '../cyph/ui/components/material/md-progress-circular.component';
import {
	MdProgressLinearComponent
} from '../cyph/ui/components/material/md-progress-linear.component';
import {MdSelectComponent} from '../cyph/ui/components/material/md-select.component';
import {MdSidenavComponent} from '../cyph/ui/components/material/md-sidenav.component';
import {MdSliderComponent} from '../cyph/ui/components/material/md-slider.component';
import {MdSubheaderComponent} from '../cyph/ui/components/material/md-subheader.component';
import {MdTabsComponent} from '../cyph/ui/components/material/md-tabs.component';
import {MdTextareaComponent} from '../cyph/ui/components/material/md-textarea.component';
import {MdToolbarComponent} from '../cyph/ui/components/material/md-toolbar.component';
import {RegisterComponent} from '../cyph/ui/components/register.component';
import {SignupFormComponent} from '../cyph/ui/components/signup-form.component';
import {TranslateDirective} from '../cyph/ui/directives/translate.directive';
import {AppComponent} from './app.component';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
	declarations: [
		AppComponent,
		ChatCyphertextComponent,
		ChatMainComponent,
		ChatMessageComponent,
		ChatMessageBoxComponent,
		CheckoutComponent,
		ContactComponent,
		FileInputComponent,
		HelpComponent,
		MarkdownComponent,
		RegisterComponent,
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
		MdSidenavComponent,
		MdSliderComponent,
		MdSubheaderComponent,
		MdTabsComponent,
		MdTextareaComponent,
		MdToolbarComponent
	],
	entryComponents: [
		AppComponent,
		FileInputComponent,
		HelpComponent,
		RegisterComponent
	],
	imports: [
		BrowserModule,
		CommonModule,
		FormsModule,
		UpgradeModule
	]
})
export class AppModule {
	/** @ignore */
	public ngDoBootstrap () : void {}

	constructor () {}
}
