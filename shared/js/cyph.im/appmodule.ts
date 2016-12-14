import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeModule} from '@angular/upgrade/static';
import {ChatCyphertext} from '../cyph/ui/components/chatcyphertext';
import {ChatMain} from '../cyph/ui/components/chatmain';
import {ChatMessage} from '../cyph/ui/components/chatmessage';
import {ChatMessageBox} from '../cyph/ui/components/chatmessagebox';
import {Contact} from '../cyph/ui/components/contact';
import {FileInput} from '../cyph/ui/components/fileinput';
import {Help} from '../cyph/ui/components/help';
import {LinkConnection} from '../cyph/ui/components/linkconnection';
import {Markdown} from '../cyph/ui/components/markdown';
import {MdButton} from '../cyph/ui/components/material/mdbutton';
import {MdCard} from '../cyph/ui/components/material/mdcard';
import {MdCardContent} from '../cyph/ui/components/material/mdcardcontent';
import {MdCardHeader} from '../cyph/ui/components/material/mdcardheader';
import {MdCardHeaderText} from '../cyph/ui/components/material/mdcardheadertext';
import {MdCardTitle} from '../cyph/ui/components/material/mdcardtitle';
import {MdCardTitleText} from '../cyph/ui/components/material/mdcardtitletext';
import {MdContent} from '../cyph/ui/components/material/mdcontent';
import {MdFabSpeedDial} from '../cyph/ui/components/material/mdfabspeeddial';
import {MdIcon} from '../cyph/ui/components/material/mdicon';
import {MdInput} from '../cyph/ui/components/material/mdinput';
import {MdList} from '../cyph/ui/components/material/mdlist';
import {MdListItem} from '../cyph/ui/components/material/mdlistitem';
import {MdMenu} from '../cyph/ui/components/material/mdmenu';
import {MdOption} from '../cyph/ui/components/material/mdoption';
import {MdProgressCircular} from '../cyph/ui/components/material/mdprogresscircular';
import {MdProgressLinear} from '../cyph/ui/components/material/mdprogresslinear';
import {MdSelect} from '../cyph/ui/components/material/mdselect';
import {MdSubheader} from '../cyph/ui/components/material/mdsubheader';
import {MdSwitch} from '../cyph/ui/components/material/mdswitch';
import {MdTabs} from '../cyph/ui/components/material/mdtabs';
import {MdTextarea} from '../cyph/ui/components/material/mdtextarea';
import {SignupForm} from '../cyph/ui/components/signupform';
import {StaticCyphNotFound} from '../cyph/ui/components/staticcyphnotfound';
import {StaticFooter} from '../cyph/ui/components/staticfooter';
import {Translate} from '../cyph/ui/directives/translate';
import {AppComponent} from './appcomponent';
import {BetaComponent} from './betacomponent';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
	declarations: [
		AppComponent,
		BetaComponent,
		ChatCyphertext,
		ChatMain,
		ChatMessage,
		ChatMessageBox,
		Contact,
		FileInput,
		Help,
		LinkConnection,
		Markdown,
		SignupForm,
		StaticCyphNotFound,
		StaticFooter,
		Translate,
		MdButton,
		MdCard,
		MdCardContent,
		MdCardHeader,
		MdCardHeaderText,
		MdCardTitle,
		MdCardTitleText,
		MdContent,
		MdFabSpeedDial,
		MdIcon,
		MdInput,
		MdList,
		MdListItem,
		MdMenu,
		MdOption,
		MdProgressCircular,
		MdProgressLinear,
		MdSelect,
		MdSubheader,
		MdSwitch,
		MdTabs,
		MdTextarea
	],
	entryComponents: [
		AppComponent,
		FileInput,
		Help
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
