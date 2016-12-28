import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeModule} from '@angular/upgrade/static';
import {ChatCyphertextComponent} from '../cyph/ui/components/chatcyphertext.component';
import {ChatMainComponent} from '../cyph/ui/components/chatmain.component';
import {ChatMessageComponent} from '../cyph/ui/components/chatmessage.component';
import {ChatMessageBoxComponent} from '../cyph/ui/components/chatmessagebox.component';
import {ContactComponent} from '../cyph/ui/components/contact.component';
import {FileInputComponent} from '../cyph/ui/components/fileinput.component';
import {HelpComponent} from '../cyph/ui/components/help.component';
import {LinkConnectionComponent} from '../cyph/ui/components/linkconnection.component';
import {MarkdownComponent} from '../cyph/ui/components/markdown.component';
import {MdButtonComponent} from '../cyph/ui/components/material/mdbutton.component';
import {MdCardComponent} from '../cyph/ui/components/material/mdcard.component';
import {MdCardContentComponent} from '../cyph/ui/components/material/mdcardcontent.component';
import {MdCardHeaderComponent} from '../cyph/ui/components/material/mdcardheader.component';
import {
	MdCardHeaderTextComponent
} from '../cyph/ui/components/material/mdcardheadertext.component';
import {MdCardTitleComponent} from '../cyph/ui/components/material/mdcardtitle.component';
import {MdCardTitleTextComponent} from '../cyph/ui/components/material/mdcardtitletext.component';
import {MdContentComponent} from '../cyph/ui/components/material/mdcontent.component';
import {MdFabSpeedDialComponent} from '../cyph/ui/components/material/mdfabspeeddial.component';
import {MdIconComponent} from '../cyph/ui/components/material/mdicon.component';
import {MdInputComponent} from '../cyph/ui/components/material/mdinput.component';
import {MdListComponent} from '../cyph/ui/components/material/mdlist.component';
import {MdListItemComponent} from '../cyph/ui/components/material/mdlistitem.component';
import {MdMenuComponent} from '../cyph/ui/components/material/mdmenu.component';
import {
	MdProgressCircularComponent
} from '../cyph/ui/components/material/mdprogresscircular.component';
import {
	MdProgressLinearComponent
} from '../cyph/ui/components/material/mdprogresslinear.component';
import {MdSelectComponent} from '../cyph/ui/components/material/mdselect.component';
import {MdSubheaderComponent} from '../cyph/ui/components/material/mdsubheader.component';
import {MdSwitchComponent} from '../cyph/ui/components/material/mdswitch.component';
import {MdTabsComponent} from '../cyph/ui/components/material/mdtabs.component';
import {MdTextareaComponent} from '../cyph/ui/components/material/mdtextarea.component';
import {SignupFormComponent} from '../cyph/ui/components/signupform.component';
import {StaticCyphNotFoundComponent} from '../cyph/ui/components/staticcyphnotfound.component';
import {StaticFooterComponent} from '../cyph/ui/components/staticfooter.component';
import {TranslateDirective} from '../cyph/ui/directives/translate.directive';
import {AppComponent} from './app.component';
import {BetaComponent} from './beta.component';


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
		ContactComponent,
		FileInputComponent,
		HelpComponent,
		LinkConnectionComponent,
		MarkdownComponent,
		SignupFormComponent,
		StaticCyphNotFoundComponent,
		StaticFooterComponent,
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
	]
})
export class AppModule {
	/** @ignore */
	public ngDoBootstrap () : void {}

	constructor () {}
}
